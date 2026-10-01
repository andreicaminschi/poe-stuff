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
  readonly showOnlySeeder: (key: string) => void;
  readonly setQuery: (query: string) => void;
  readonly setView: (view: View) => void;
  readonly editing: string | undefined;
  readonly pending: readonly WalEntry[];
  readonly saving: boolean;
  readonly openEditor: (key: string) => void;
  readonly closeEditor: () => void;
  readonly applySeeder: (key: string, seeder: Seeder, toCategory: string) => void;
  readonly deleteSeeder: (key: string) => void;
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

    set({ pickedCategories: next, pickedSeeders: keepInScope(pickedSeeders, next), view: "items" });
  },

  pickSeeder: (key) => set({ pickedSeeders: [...get().pickedSeeders, key], view: "items" }),
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

  showOnlySeeder: (key) => set({ pickedSeeders: [key], view: "items" }),
  setQuery: (query) => set({ query, view: "items" }),
  setView: (view) => set({ view }),

  editing: undefined,
  pending: [],
  saving: false,
  openEditor: (key) => set({ editing: key }),
  closeEditor: () => set({ editing: undefined }),

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
      editing: undefined,
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
      editing: undefined,
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
