import { create } from "zustand";
import type { Draft, Validation, VersionList } from "../api/panel-api.ts";
import type { Category, Item } from "../api/taxonomy.types.ts";
import type { Changes, Dialog, Tab, View } from "./types.ts";
import { changeCount } from "./utils/change-count.ts";
import { NO_CHANGES } from "./utils/no-changes.ts";
import { pathOf } from "./utils/path-of.ts";
import { toDraftChanges } from "./utils/to-draft-changes.ts";
import { withCategory } from "./utils/with-category.ts";
import { withItem } from "./utils/with-item.ts";

export type Session = {
  readonly versions?: VersionList;
  readonly versionId?: string;
  readonly saved?: Draft;
  readonly changes: Changes;
  readonly view: View;
  readonly selection?: string;
  readonly selectedKey?: string;
  readonly checked: readonly string[];
  readonly tab: Tab;
  readonly dialog?: Dialog;
  readonly validation?: Validation;
  readonly status?: string;
  readonly error?: string;
  readonly busy: boolean;
  readonly priceNames: readonly string[];

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
  editCategory(category: Category): void;
  revert(): void;
  save(): Promise<void>;
  validate(): Promise<void>;
  publish(): Promise<void>;
  dismissError(): void;
};

const message = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

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
    const draft = await window.panel.getVersion(id);
    if (get().versionId === id) set({ saved: draft, changes: NO_CHANGES });
  };

  const checkedState = (checked: readonly string[]): Partial<Session> =>
    checked.length === 1 ? { checked, selectedKey: checked[0] } : { checked };

  const discardConfirmed = (): boolean =>
    changeCount(get().changes) === 0 || window.confirm("Discard unsaved edits?");

  return {
    changes: NO_CHANGES,
    view: "included",
    checked: [],
    tab: "item",
    busy: false,
    priceNames: [],

    boot: () =>
      run(async () => {
        if (get().versions !== undefined) return;
        window.panel.getPriceNames().then((priceNames) => set({ priceNames }), () => {});
        const list = await loadVersions();
        const id = list.versions.find((version) => version.editable)?.id ?? list.current ?? list.versions[0]?.id;
        set({ versionId: id });
        if (id !== undefined) await loadVersion(id);
      }),

    switchVersion(id) {
      if (!discardConfirmed()) return;
      set({ versionId: id, saved: undefined, selectedKey: undefined, checked: [] });
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
        set({ versionId: id, saved: undefined, selectedKey: undefined, checked: [], status: result.log.trim() });
        if (id !== undefined) await loadVersion(id);
      }),

    setView: (view) => set({ view, selection: undefined, selectedKey: undefined, checked: [] }),

    select: (path) => set({ selection: path, selectedKey: undefined, checked: [] }),

    toggleCategory: (path) =>
      set((state) => ({ selection: state.selection === path ? undefined : path, selectedKey: undefined, checked: [] })),

    selectItem: (key, tab) => set(tab === undefined ? { selectedKey: key } : { selectedKey: key, tab }),

    toggleChecked: (key) =>
      set((state) =>
        checkedState(
          state.checked.includes(key) ? state.checked.filter((other) => other !== key) : [...state.checked, key],
        ),
      ),

    setChecked: (keys) => set(checkedState(keys)),

    goTo(key) {
      const target = get().changes.items[key] ?? get().saved?.items[key];
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

    editCategory: (category) =>
      set((state) => ({ changes: withCategory(state.changes, category.path, category) })),

    revert: () => set({ changes: NO_CHANGES }),

    save: () =>
      run(async () => {
        const { versionId, changes } = get();
        if (versionId === undefined) return;
        const count = changeCount(changes);
        await window.panel.saveDraft(versionId, toDraftChanges(changes));
        await loadVersion(versionId);
        set({ status: `Saved ${count} edit${count === 1 ? "" : "s"}.` });
      }),

    validate: () =>
      run(async () => {
        const { versionId } = get();
        if (versionId === undefined) return;
        set({ status: "Validating…" });
        const validation = await window.panel.validate(versionId);
        set({ validation, status: undefined, dialog: { kind: "validation" } });
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

        set({ status: "Validating…" });
        const validation = await window.panel.validate(versionId);
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
