import { create } from "zustand";
import type { LoadedVersion } from "../panel-api.ts";
import type { Category, Seeder, WalEntry } from "../types.ts";
import { applyEntry, findUndoable, invertEntry } from "./apply-entry.ts";
import { countItemsBySeeder } from "./count-items.ts";
import { generateItems, type SeededItem } from "./generate-items.ts";
import { formatSeederKey, readSeederCategory, readSeederName } from "./seeder-key.ts";

export type View = "items" | "seeders";

type Loaded = LoadedVersion & {
  readonly items: readonly SeededItem[];
  readonly itemCounts: ReadonlyMap<string, number>;
};

type PanelState = {
  readonly loaded: Loaded | undefined;
  readonly error: string | undefined;
  readonly pickedCategories: readonly string[];
  readonly pickedSeeders: readonly string[];
  readonly query: string;
  readonly view: View;
  readonly load: () => Promise<void>;
  readonly toggleCategory: (name: string) => void;
  readonly pickSeeder: (key: string) => void;
  readonly dropSeeder: (key: string) => void;
  readonly dropLastToken: () => void;
  readonly setQuery: (query: string) => void;
  readonly setView: (view: View) => void;
  readonly selected: string | undefined;
  readonly dirty: boolean;
  readonly leaveAction: (() => void) | undefined;
  readonly pending: readonly WalEntry[];
  readonly saving: boolean;
  readonly setDirty: (dirty: boolean) => void;
  readonly guard: (action: () => void) => void;
  readonly confirmLeave: () => void;
  readonly cancelLeave: () => void;
  readonly selectSeeder: (key: string) => void;
  readonly selectFirst: (key: string | undefined) => void;
  readonly goToItems: (action: () => void) => void;
  readonly applySeeder: (key: string, seeder: Seeder, toCategory: string) => void;
  readonly deleteSeeder: (key: string) => void;
  readonly dialog: "category" | "seeder" | undefined;
  readonly openDialog: (dialog: "category" | "seeder") => void;
  readonly closeDialog: () => void;
  readonly createCategory: (name: string) => void;
  readonly createSeeder: (category: string, name: string) => void;
  readonly undo: () => void;
  readonly save: () => Promise<void>;
};

/** Finds the seeder a key names, in the open version. */
const findSeeder = (categories: readonly Category[], key: string): Seeder | undefined =>
  categories.find((category) => category.name === readSeederCategory(key))?.seeders.find((seeder) => seeder.name === readSeederName(key));

/** Builds a new log entry stamped with a fresh id and the current time. */
const stampEntry = (category: string, before: Seeder | undefined, after: Seeder | undefined): WalEntry => ({
  id: crypto.randomUUID(),
  at: new Date().toISOString(),
  category,
  ...(before === undefined
    ? {}
    : { before }),
  ...(after === undefined
    ? {}
    : { after }),
});

/** Reads a thrown value as a message. Low, Sonar 1. */
const readMessage = (error: unknown): string => (error instanceof Error
  ? error.message
  : String(error));

/** Pairs a version with the items its categories generate. */
function withItems(version: LoadedVersion): Loaded {
  const items = version.categories.flatMap(generateItems);

  return { ...version, items, itemCounts: countItemsBySeeder(items) };
}

/** Pairs new categories with the open version and their items. */
const withCategories = (loaded: Loaded, categories: readonly Category[]): Loaded =>
  withItems({ version: loaded.version, state: loaded.state, categories, log: loaded.log });

/** Keeps only the seeder tokens inside the picked categories. Low, Sonar 1. */
const keepInScope = (seeders: readonly string[], categories: readonly string[]): readonly string[] =>
  categories.length === 0
    ? seeders
    : seeders.filter((key) => categories.includes(readSeederCategory(key)));

export const usePanel = create<PanelState>()((set, get) => ({
  loaded: undefined,
  error: undefined,
  pickedCategories: [],
  pickedSeeders: [],
  query: "",
  view: "items",

  load: async () => {
    try {
      set({ loaded: withItems(await window.panel.loadVersion()) });
    } catch (error) {
      set({ error: readMessage(error) });
    }
  },

  toggleCategory: (name) => {
    const { pickedCategories, pickedSeeders } = get();
    const next = pickedCategories.includes(name)
      ? pickedCategories.filter((at) => at !== name)
      : [...pickedCategories, name];

    set({ pickedCategories: next, pickedSeeders: keepInScope(pickedSeeders, next) });
  },

  pickSeeder: (key) => set({ pickedSeeders: [...get().pickedSeeders, key] }),
  dropSeeder: (key) => set({ pickedSeeders: get().pickedSeeders.filter((at) => at !== key) }),

  dropLastToken: () => {
    const { pickedCategories, pickedSeeders } = get();

    if (pickedSeeders.length > 0) {
      set({ pickedSeeders: pickedSeeders.slice(0, -1) });
      return;
    }
    const next = pickedCategories.slice(0, -1);
    set({ pickedCategories: next, pickedSeeders: keepInScope(pickedSeeders, next) });
  },

  setQuery: (query) => set({ query }),
  setView: (view) => get().guard(() => set({ view })),

  selected: undefined,
  dirty: false,
  leaveAction: undefined,
  pending: [],
  saving: false,
  setDirty: (dirty) => set({ dirty }),

  guard: (action) => {
    if (get().dirty) {
      set({ leaveAction: action });
      return;
    }
    action();
  },

  confirmLeave: () => {
    const { leaveAction } = get();
    set({ dirty: false, leaveAction: undefined });
    leaveAction?.();
  },

  cancelLeave: () => set({ leaveAction: undefined }),
  selectSeeder: (key) => get().guard(() => set({ selected: key, view: "seeders" })),
  selectFirst: (key) => set({ selected: key, dirty: false }),
  goToItems: (action) => get().guard(() => {
    action();
    set({ view: "items" });
  }),

  applySeeder: (key, seeder, toCategory) => {
    const { loaded, pending, pickedSeeders } = get();
    if (loaded === undefined) return;

    const category = readSeederCategory(key);
    const stamped = stampEntry(category, findSeeder(loaded.categories, key), seeder);
    const entry = toCategory === category
      ? stamped
      : { ...stamped, toCategory };
    const renamed = formatSeederKey(toCategory, seeder.name);

    set({
      loaded: withCategories(loaded, applyEntry(loaded.categories, entry)),
      pickedSeeders: pickedSeeders.map((at) => (at === key
        ? renamed
        : at)),
      pending: [...pending, entry],
      selected: renamed,
      dirty: false,
    });
  },

  deleteSeeder: (key) => {
    const { loaded, pending, pickedSeeders } = get();
    if (loaded === undefined) return;

    const entry = stampEntry(readSeederCategory(key), findSeeder(loaded.categories, key), undefined);

    set({
      loaded: withCategories(loaded, applyEntry(loaded.categories, entry)),
      pickedSeeders: pickedSeeders.filter((at) => at !== key),
      pending: [...pending, entry],
      selected: undefined,
      dirty: false,
    });
  },

  dialog: undefined,
  openDialog: (dialog) => get().guard(() => set({ dialog })),
  closeDialog: () => set({ dialog: undefined }),

  createCategory: (name) => {
    const { loaded, pending } = get();
    if (loaded === undefined) return;

    const entry: WalEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), category: name, op: "createCategory" };

    set({
      loaded: withCategories(loaded, applyEntry(loaded.categories, entry)),
      pending: [...pending, entry],
      pickedCategories: [name],
      pickedSeeders: [],
      selected: undefined,
      dirty: false,
      view: "seeders",
      dialog: undefined,
    });
  },

  createSeeder: (category, name) => {
    const { loaded, pending } = get();
    if (loaded === undefined) return;

    const { pickedCategories } = get();
    const entry = stampEntry(category, undefined, { name, conditions: {}, tags: [] });
    const inScope = pickedCategories.length === 0 || pickedCategories.includes(category);

    set({
      loaded: withCategories(loaded, applyEntry(loaded.categories, entry)),
      pending: [...pending, entry],
      pickedCategories: inScope
        ? pickedCategories
        : [...pickedCategories, category],
      selected: formatSeederKey(category, name),
      dirty: false,
      view: "seeders",
      dialog: undefined,
    });
  },

  undo: () => {
    const { loaded, pending } = get();
    if (loaded === undefined) return;

    const target = findUndoable([...loaded.log, ...pending]);
    if (target === undefined) return;

    const entry = invertEntry(target, crypto.randomUUID(), new Date().toISOString());
    set({ loaded: withCategories(loaded, applyEntry(loaded.categories, entry)), pending: [...pending, entry] });
  },

  save: async () => {
    const { loaded, pending } = get();
    if (loaded === undefined) return;

    set({ saving: true, error: undefined });
    try {
      set({ loaded: withItems(await window.panel.saveVersion(loaded.version, loaded.categories, pending)), pending: [] });
    } catch (error) {
      set({ error: `Save failed: ${readMessage(error)}` });
    } finally {
      set({ saving: false });
    }
  },
}));
