import { create } from "zustand";
import type { CompiledFilter, Draft, Ledger, LedgerEntry, Validation, VersionList } from "../api/panel-api.ts";
import type { Category, DraftChanges, Item } from "../api/taxonomy/types.ts";
import type { BootState, BootStep, Changes, Dialog, PriceOption, Tab, ValueOption, View } from "./types.ts";
import { mergePriceNames } from "./utils/merge-price-names.ts";
import { missingListings } from "./utils/missing-listings.ts";
import { moveSubcategory } from "./utils/move-subcategory.ts";
import { renameCategory } from "./utils/rename-category.ts";
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
  readonly selectedVariant?: string;
  readonly checked: readonly string[];
  readonly tab: Tab;
  readonly dialog?: Dialog;
  readonly confirmation?: Confirmation;
  readonly validation?: Validation;
  readonly compiled?: CompiledFilter;
  readonly status?: string;
  readonly error?: string;
  readonly busy: boolean;
  readonly booting: boolean;
  readonly bootSteps: readonly BootStep[];
  readonly priceOptions: readonly PriceOption[];

  boot(): Promise<void>;
  switchVersion(id: string): Promise<void>;
  newDraft(parent: string): Promise<void>;
  setView(view: View): Promise<void>;
  select(path: string): Promise<void>;
  toggleCategory(path: string): Promise<void>;
  selectItem(key: string, tab?: Tab): Promise<void>;
  selectVariant(key: string, name: string): Promise<void>;
  setVariant(name: string | undefined): void;
  toggleChecked(key: string): Promise<void>;
  setChecked(keys: readonly string[]): Promise<void>;
  goTo(key: string): Promise<void>;
  setTab(tab: Tab): void;
  openDialog(dialog: Dialog): void;
  closeDialog(): void;
  confirm(message: string): Promise<boolean>;
  editItem(item: Item): void;
  editItems(items: readonly Item[]): void;
  authorRow(item: Item): Promise<void>;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(path: string): Promise<void>;
  moveSubcategory(from: string, to: Category): Promise<void>;
  renameCategory(from: string, to: Category): Promise<void>;
  undo(): Promise<void>;
  revert(): void;
  save(): Promise<void>;
  validate(): Promise<void>;
  compileFilter(): Promise<void>;
  publish(): Promise<void>;
  dismissError(): void;
};

const message = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

/** A question the in-app confirm dialog is asking, and how to answer it. */
export type Confirmation = { readonly message: string; readonly settle: (ok: boolean) => void };

const BOOT_STEPS: readonly BootStep[] = [
  { id: "versions", label: "Reading taxonomy versions", state: "waiting" },
  { id: "draft", label: "Loading the draft and its ledger", state: "waiting" },
  { id: "listings", label: "Downloading PoeWatch listings", state: "waiting" },
  { id: "exchange", label: "Downloading PoeWatch exchange", state: "waiting" },
  { id: "corruptions", label: "Downloading PoeWatch corruptions", state: "waiting" },
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

  // Native confirm breaks input focus.
  const ask = (text: string): Promise<boolean> =>
    new Promise((settle) =>
      set({
        confirmation: {
          message: text,
          settle: (ok) => {
            set({ confirmation: undefined });
            settle(ok);
          },
        },
      }),
    );

  const discardConfirmed = async (): Promise<boolean> =>
    changeCount(get().changes) === 0 || (await ask("Discard unsaved edits?"));

  const leaveEdits = async (): Promise<boolean> => {
    if (!(await discardConfirmed())) return false;
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

      const [listings, exchange, corruptions] = await Promise.all([
        bootStep("listings", () => window.panel.getListingNames(), (names) => countOf(names.length, "names")),
        bootStep("exchange", () => window.panel.getExchangeNames(), (names) => countOf(names.length, "names")),
        bootStep("corruptions", () => window.panel.getCorruptionNames(), (names) => countOf(names.length, "outcomes")),
      ]);

      set({
        priceOptions: mergePriceNames([...(listings ?? []), ...(corruptions ?? [])], exchange ?? []),
        booting: false,
      });
    },

    async switchVersion(id) {
      if (!(await discardConfirmed())) return;
      set({ versionId: id, base: undefined, ledger: [], saved: undefined, selectedKey: undefined, checked: [] });
      void run(() => loadVersion(id));
    },

    newDraft: (parent) =>
      run(async () => {
        if (!(await discardConfirmed())) return;
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

    async setView(view) {
      if (!(await leaveEdits())) return;
      set({ view, selection: undefined, selectedKey: undefined, checked: [] });
    },

    async select(path) {
      if (!(await leaveEdits())) return;
      set({ selection: path, selectedKey: undefined, checked: [] });
    },

    async toggleCategory(path) {
      if (!(await leaveEdits())) return;
      set((state) => ({ selection: state.selection === path ? undefined : path, selectedKey: undefined, checked: [] }));
    },

    async selectItem(key, tab) {
      if (key !== get().selectedKey && !(await leaveEdits())) return;
      set(tab === undefined ? { selectedKey: key } : { selectedKey: key, tab });
    },

    async selectVariant(key, name) {
      if (key !== get().selectedKey && !(await leaveEdits())) return;
      set({ selectedKey: key, tab: "variants", selectedVariant: name });
    },

    setVariant: (name) => set({ selectedVariant: name }),

    async toggleChecked(key) {
      if (!(await leaveEdits())) return;
      set((state) =>
        checkedState(
          state.checked.includes(key) ? state.checked.filter((other) => other !== key) : [...state.checked, key],
        ),
      );
    },

    async setChecked(keys) {
      if (!(await leaveEdits())) return;
      set(checkedState(keys));
    },

    async goTo(key) {
      if (!(await leaveEdits())) return;
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

    confirm: ask,

    editItem: (item) => set((state) => ({ changes: withItem(state.changes, item) })),

    editItems: (items) => set((state) => ({ changes: items.reduce(withItem, state.changes) })),

    async authorRow(item) {
      if (!(await leaveEdits())) return;
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

    moveSubcategory: (from, to) =>
      run(async () => {
        const { saved, changes } = get();
        if (saved === undefined) return;
        if (changeCount(changes) > 0) {
          set({ error: "Save or revert your edits before moving a subcategory." });
          return;
        }

        const move = moveSubcategory(saved, from, to);
        if ("problem" in move) {
          set({ error: move.problem });
          return;
        }

        await append("move-subcategory", move.changes);
        const rows = Object.keys(move.changes.items ?? {}).length;
        set((state) => ({
          status: `Moved ${from} to ${to.path}, ${rows} row${rows === 1 ? "" : "s"}.`,
          ...(state.selection === from ? { selection: to.path } : {}),
        }));
      }),

    renameCategory: (from, to) =>
      run(async () => {
        const { saved, changes } = get();
        if (saved === undefined) return;
        if (changeCount(changes) > 0) {
          set({ error: "Save or revert your edits before renaming a category." });
          return;
        }

        const rename = renameCategory(saved, from, to);
        if ("problem" in rename) {
          set({ error: rename.problem });
          return;
        }

        await append("rename-category", rename.changes);
        const rows = Object.keys(rename.changes.items ?? {}).length;
        set((state) => ({
          status: `Renamed ${from} to ${to.path}, ${rows} row${rows === 1 ? "" : "s"}.`,
          ...(state.selection === from || state.selection?.startsWith(`${from}/`) === true
            ? { selection: `${to.path}${state.selection.slice(from.length)}` }
            : {}),
        }));
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
        const missing = missingListings(Object.values(changes.items));
        if (missing.length > 0) {
          set({ error: `Pick "Listed as" before saving: ${missing.join(", ")}` });
          return;
        }
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
        if (!(await ask(`Publish ${versionId} and make it current? A published version can never be changed.`))) {
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
