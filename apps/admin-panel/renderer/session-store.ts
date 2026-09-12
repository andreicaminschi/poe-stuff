import { create } from "zustand";
import type { CompiledFilter, Draft, Ledger, LedgerEntry, Validation, VersionList } from "../api/panel-api.ts";
import type { Category, DraftChanges, Item } from "../api/taxonomy/types.ts";
import type { BootState, BootStep, Changes, Dialog, Tab, ValueOption, View } from "./types.ts";
import { mergePriceNames } from "./utils/merge-price-names.ts";
import { changeCount } from "./utils/change-count.ts";
import { NO_CHANGES } from "./utils/no-changes.ts";
import { pathOf } from "./utils/path-of.ts";
import { replayLedger } from "./utils/replay-ledger.ts";
import { toDraftChanges } from "./utils/to-draft-changes.ts";
import { withItem } from "./utils/with-item.ts";

export type Session = {
  readonly versions?: VersionList;
  readonly versionId?: string;
  readonly base?: Draft;
  readonly ledger: Ledger;
  readonly saved?: Draft;
  readonly changes: Changes;
  readonly view: View;
  readonly selection?: string;
  readonly selectedKey?: string;
  readonly checked: readonly string[];
  readonly tab: Tab;
  readonly dialog?: Dialog;
  readonly validation?: Validation;
  readonly compiled?: CompiledFilter;
  readonly status?: string;
  readonly error?: string;
  readonly busy: boolean;
  readonly booting: boolean;
  readonly bootSteps: readonly BootStep[];
  readonly priceOptions: readonly ValueOption[];

  boot(): Promise<void>;
  switchVersion(id: string): void;
  newDraft(parent: string): Promise<void>;
  setView(view: View): void;
  select(path: string): void;
  toggleCategory(path: string): void;
  selectItem(key: string, tab?: Tab): void;
  toggleChecked(key: string): void;
  setChecked(keys: readonly string[]): void;
  goTo(key: string): void;
  setTab(tab: Tab): void;
  openDialog(dialog: Dialog): void;
  closeDialog(): void;
  editItem(item: Item): void;
  editItems(items: readonly Item[]): void;
  authorRow(item: Item): void;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(path: string): Promise<void>;
  undo(): Promise<void>;
  revert(): void;
  save(): Promise<void>;
  validate(): Promise<void>;
  compileFilter(): Promise<void>;
  publish(): Promise<void>;
  dismissError(): void;
};

const message = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

const BOOT_STEPS: readonly BootStep[] = [
  { id: "versions", label: "Reading taxonomy versions", state: "waiting" },
  { id: "draft", label: "Loading the draft and its ledger", state: "waiting" },
  { id: "listings", label: "Downloading PoeWatch listings", state: "waiting" },
  { id: "exchange", label: "Downloading PoeWatch exchange", state: "waiting" },
];

const countOf = (count: number, noun: string): string => `${count.toLocaleString("en")} ${noun}`;

export const useSession = create<Session>()((set, get) => {
  const run = async (task: () => Promise<void>): Promise<void> => {
    set({ busy: true, error: undefined });
    try {
      await task();
    } catch (reason) {
      set({ error: message(reason) });
    } finally {
      set({ busy: false });
    }
  };

  const loadVersions = async (): Promise<VersionList> => {
    const versions = await window.panel.getVersions();
    set({ versions });
    return versions;
  };

  const loadVersion = async (id: string): Promise<void> => {
    const [draft, ledger] = await Promise.all([window.panel.getVersion(id), window.panel.getLedger(id)]);
    if (get().versionId === id) {
      set({ base: draft, ledger, saved: replayLedger(draft, ledger), changes: NO_CHANGES });
    }
  };

  const append = async (action: LedgerEntry["action"], changes: DraftChanges): Promise<void> => {
    const { versionId, base, ledger } = get();
    if (versionId === undefined || base === undefined) return;

    const entry: LedgerEntry = { seq: (ledger.at(-1)?.seq ?? 0) + 1, at: new Date().toISOString(), action, changes };
    await window.panel.appendLedger(versionId, entry);

    const next = [...ledger, entry];
    set({ ledger: next, saved: replayLedger(base, next) });
  };

  const isEditable = (): boolean => {
    const { versions, versionId } = get();
    return versions?.versions.find((version) => version.id === versionId)?.editable === true;
  };

  const checkedState = (checked: readonly string[]): Partial<Session> =>
    checked.length === 1 ? { checked, selectedKey: checked[0] } : { checked };

  const mark = (id: string, state: BootState, detail?: string): void =>
    set((current) => ({
      bootSteps: current.bootSteps.map((step) =>
        step.id === id ? { id: step.id, label: step.label, state, ...(detail === undefined ? {} : { detail }) } : step,
      ),
    }));

  /** One boot step: running, then done with a detail, or failed with the reason. */
  const bootStep = async <T>(id: string, work: () => Promise<T>, detail: (result: T) => string): Promise<T | undefined> => {
    mark(id, "running");
    try {
      const result = await work();
      mark(id, "done", detail(result));
      return result;
    } catch (reason) {
      mark(id, "failed", message(reason));
      return undefined;
    }
  };

  const discardConfirmed = (): boolean =>
    changeCount(get().changes) === 0 || window.confirm("Discard unsaved edits?");

  const leaveEdits = (): boolean => {
    if (!discardConfirmed()) return false;
    if (changeCount(get().changes) > 0) set({ changes: NO_CHANGES });
    return true;
  };

  return {
    ledger: [],
    changes: NO_CHANGES,
    view: "included",
    checked: [],
    tab: "item",
    busy: false,
    booting: false,
    bootSteps: [],
    priceOptions: [],

    async boot() {
      if (get().versions !== undefined || get().booting) return;
      set({ booting: true, bootSteps: BOOT_STEPS });

      const list = await bootStep("versions", loadVersions, (versions) => countOf(versions.versions.length, "versions"));
      if (list === undefined) return;

      const id = list.versions.find((version) => version.editable)?.id ?? list.current ?? list.versions[0]?.id;
      set({ versionId: id });

      if (id === undefined) {
        mark("draft", "done", "no version to open");
      } else {
        const loaded = await bootStep(
          "draft",
          async () => {
            await loadVersion(id);
            return get().ledger.length;
          },
          (saved) => `${id}, ${countOf(saved, "saved edits")}`,
        );
        if (loaded === undefined) return;
      }

      const [listings, exchange] = await Promise.all([
        bootStep("listings", () => window.panel.getListingNames(), (names) => countOf(names.length, "names")),
        bootStep("exchange", () => window.panel.getExchangeNames(), (names) => countOf(names.length, "names")),
      ]);

      set({ priceOptions: mergePriceNames(listings ?? [], exchange ?? []), booting: false });
    },

    switchVersion(id) {
      if (!discardConfirmed()) return;
      set({ versionId: id, base: undefined, ledger: [], saved: undefined, selectedKey: undefined, checked: [] });
      void run(() => loadVersion(id));
    },

    newDraft: (parent) =>
      run(async () => {
        if (!discardConfirmed()) return;
        set({ status: `Creating a draft from ${parent}…` });
        const result = await window.panel.createVersion(parent);
        if (!result.ok) throw new Error(result.log);
        const list = await loadVersions();
        const id = list.versions.find((version) => version.editable)?.id;
        set({
          versionId: id,
          base: undefined,
          ledger: [],
          saved: undefined,
          selectedKey: undefined,
          checked: [],
          status: result.log.trim(),
        });
        if (id !== undefined) await loadVersion(id);
      }),

    setView(view) {
      if (!leaveEdits()) return;
      set({ view, selection: undefined, selectedKey: undefined, checked: [] });
    },

    select(path) {
      if (!leaveEdits()) return;
      set({ selection: path, selectedKey: undefined, checked: [] });
    },

    toggleCategory(path) {
      if (!leaveEdits()) return;
      set((state) => ({ selection: state.selection === path ? undefined : path, selectedKey: undefined, checked: [] }));
    },

    selectItem(key, tab) {
      if (key !== get().selectedKey && !leaveEdits()) return;
      set(tab === undefined ? { selectedKey: key } : { selectedKey: key, tab });
    },

    toggleChecked(key) {
      if (!leaveEdits()) return;
      set((state) =>
        checkedState(
          state.checked.includes(key) ? state.checked.filter((other) => other !== key) : [...state.checked, key],
        ),
      );
    },

    setChecked(keys) {
      if (!leaveEdits()) return;
      set(checkedState(keys));
    },

    goTo(key) {
      if (!leaveEdits()) return;
      const target = get().saved?.items[key];
      if (target === undefined) return;
      set({
        view: target.excluded === true ? "excluded" : "included",
        selection: pathOf(target.classification),
        selectedKey: key,
        checked: [],
        tab: "item",
        dialog: undefined,
      });
    },

    setTab: (tab) => set({ tab }),

    openDialog: (dialog) => set({ dialog }),

    closeDialog: () => set({ dialog: undefined }),

    editItem: (item) => set((state) => ({ changes: withItem(state.changes, item) })),

    editItems: (items) => set((state) => ({ changes: items.reduce(withItem, state.changes) })),

    authorRow(item) {
      if (!leaveEdits()) return;
      set((state) => ({
        changes: withItem(state.changes, item),
        view: "included",
        selection: pathOf(item.classification),
        selectedKey: item.key,
        checked: [],
        tab: "item",
        dialog: undefined,
      }));
    },

    saveCategory: (category) =>
      run(async () => {
        await append("save-category", { categories: { [category.path]: category } });
        set({ status: `Saved ${category.path}.` });
      }),

    deleteCategory: (path) =>
      run(async () => {
        await append("delete-category", { categories: { [path]: null } });
        set((state) => ({
          status: `Deleted ${path}.`,
          ...(state.selection === path ? { selection: undefined, selectedKey: undefined, checked: [] } : {}),
        }));
      }),

    undo: () =>
      run(async () => {
        const { versionId, base, ledger, changes } = get();
        const last = ledger.at(-1);
        if (versionId === undefined || base === undefined || last === undefined || !isEditable()) return;
        if (changeCount(changes) > 0) {
          set({ error: "Save or revert your edits before undoing." });
          return;
        }

        await window.panel.popLedger(versionId, last.seq);
        const next = ledger.slice(0, -1);
        set({ ledger: next, saved: replayLedger(base, next), status: `Undid ${last.action} #${last.seq}.` });
      }),

    revert: () => set({ changes: NO_CHANGES }),

    save: () =>
      run(async () => {
        const { versionId, changes } = get();
        if (versionId === undefined) return;
        const count = changeCount(changes);
        if (count === 0) return;
        await append("save-items", toDraftChanges(changes));
        set({ changes: NO_CHANGES, status: `Saved ${count} edit${count === 1 ? "" : "s"}.` });
      }),

    validate: () =>
      run(async () => {
        const { versionId } = get();
        if (versionId === undefined) return;
        set({ status: "Validating…" });
        const validation = await window.panel.validate(versionId, toDraftChanges(get().changes));
        set({ validation, status: undefined, dialog: { kind: "validation" } });
      }),

    compileFilter: () =>
      run(async () => {
        const { versionId } = get();
        if (versionId === undefined) return;
        set({ status: "Compiling…" });
        const compiled = await window.panel.compileFilter(versionId, toDraftChanges(get().changes));
        set({
          compiled,
          status: `Wrote ${compiled.blocks} blocks to ${compiled.path}. ${compiled.skipped.length} skipped.`,
          ...(compiled.skipped.length > 0 ? { dialog: { kind: "compiled" as const } } : {}),
        });
      }),

    publish: () =>
      run(async () => {
        const { versionId, changes } = get();
        if (versionId === undefined) return;
        if (changeCount(changes) > 0) {
          set({ error: "Save or revert your edits before publishing." });
          return;
        }
        if (!window.confirm(`Publish ${versionId} and make it current? A published version can never be changed.`)) {
          return;
        }

        set({ status: "Writing the ledger into the draft…" });
        await window.panel.commitLedger(versionId);
        await loadVersion(versionId);

        set({ status: "Validating…" });
        const validation = await window.panel.validate(versionId, toDraftChanges(get().changes));
        set({ validation });
        if (validation.rows.length > 0) {
          set({ status: undefined, dialog: { kind: "validation" } });
          return;
        }

        set({ status: "Publishing…" });
        const published = await window.panel.publishVersion(versionId);
        if (!published.ok) throw new Error(published.log);
        const promoted = await window.panel.promoteVersion(versionId);
        if (!promoted.ok) throw new Error(promoted.log);

        await loadVersions();
        set({ status: `${versionId} is published and current.` });
      }),

    dismissError: () => set({ error: undefined }),
  };
});
