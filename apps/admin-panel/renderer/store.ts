import { create } from "zustand";
import type { LoadedVersion } from "../panel-api.ts";
import type { Category, Seeder } from "../types.ts";
import { generateItems, type SeededItem } from "./generate-items.ts";
import { replaceSeeder } from "./replace-seeder.ts";
import { formatSeederKey, readSeederCategory } from "./seeder-key.ts";

export type View = "items" | "seeders";

type Loaded = LoadedVersion & { readonly items: readonly SeededItem[] };

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
  readonly edits: number;
  readonly saving: boolean;
  readonly openEditor: (key: string) => void;
  readonly closeEditor: () => void;
  readonly applySeeder: (key: string, seeder: Seeder) => void;
  readonly deleteSeeder: (key: string) => void;
  readonly save: () => Promise<void>;
};

/** Reads a thrown value as a message. Low, Sonar 1. */
const readMessage = (error: unknown): string => (error instanceof Error
  ? error.message
  : String(error));

/** Pairs a version with the items its categories generate. Low, Sonar 0. */
const withItems = (version: LoadedVersion): Loaded => ({ ...version, items: version.categories.flatMap(generateItems) });

/** Pairs new categories with the open version and their items. Low, Sonar 0. */
const withCategories = (loaded: Loaded, categories: readonly Category[]): Loaded =>
  withItems({ version: loaded.version, state: loaded.state, categories });

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
  edits: 0,
  saving: false,
  openEditor: (key) => set({ editing: key }),
  closeEditor: () => set({ editing: undefined }),

  applySeeder: (key, seeder) => {
    const { loaded, edits, pickedSeeders } = get();
    if (loaded === undefined) return;

    const renamed = formatSeederKey(readSeederCategory(key), seeder.name);

    set({
      loaded: withCategories(loaded, replaceSeeder(loaded.categories, key, seeder)),
      pickedSeeders: pickedSeeders.map((at) => (at === key
        ? renamed
        : at)),
      edits: edits + 1,
      editing: undefined,
    });
  },

  deleteSeeder: (key) => {
    const { loaded, edits, pickedSeeders } = get();
    if (loaded === undefined) return;

    set({
      loaded: withCategories(loaded, replaceSeeder(loaded.categories, key, undefined)),
      pickedSeeders: pickedSeeders.filter((at) => at !== key),
      edits: edits + 1,
      editing: undefined,
    });
  },

  save: async () => {
    const { loaded } = get();
    if (loaded === undefined) return;

    set({ saving: true, error: undefined });
    try {
      set({ loaded: withItems(await window.panel.saveVersion(loaded.version, loaded.categories)), edits: 0 });
    } catch (error) {
      set({ error: `Save failed: ${readMessage(error)}` });
    } finally {
      set({ saving: false });
    }
  },
}));
