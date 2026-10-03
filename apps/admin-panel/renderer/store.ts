import { create } from "zustand";
import { canonicalJson } from "../canonical-json.ts";
import type { Command } from "../commands.ts";
import { findSeeder } from "../panel-state.ts";
import { formatSeederKey, readSeederCategory, readSeederName } from "../seeder-key.ts";
import type { Category, PanelState, Seeder, WalEntry } from "../types.ts";
import { countItemsBySeeder } from "./count-items.ts";
import { generateItems, type SeededItem } from "./generate-items.ts";
import { loadUserKey } from "./load-user-key.ts";
import { signProof } from "./sign-proof.ts";

export type View = "items" | "seeders";

export type Dialog = "category" | "seeder";

type Loaded = {
  readonly version: string;
  readonly state: PanelState["state"];
  readonly categories: readonly Category[];
  readonly log: readonly WalEntry[];
  readonly items: readonly SeededItem[];
  readonly itemCounts: ReadonlyMap<string, number>;
};

type Store = {
  readonly loaded: Loaded | undefined;
  readonly pending: readonly WalEntry[];
  readonly error: string | undefined;
  readonly pickedCategories: readonly string[];
  readonly pickedSeeders: readonly string[];
  readonly query: string;
  readonly view: View;
  readonly selected: string | undefined;
  readonly dialog: Dialog | undefined;
  readonly saving: boolean;
  readonly dirty: boolean;
  readonly leaveAction: (() => void) | undefined;
  readonly dispatch: (command: Command) => Promise<WalEntry | undefined>;
  readonly load: () => Promise<void>;
  readonly toggleCategory: (name: string) => void;
  readonly pickSeeder: (key: string) => void;
  readonly dropSeeder: (key: string) => void;
  readonly dropLastToken: () => void;
  readonly setQuery: (query: string) => void;
  readonly setView: (view: View) => void;
  readonly setDirty: (dirty: boolean) => void;
  readonly guard: (action: () => void) => void;
  readonly confirmLeave: () => void;
  readonly cancelLeave: () => void;
  readonly selectSeeder: (key: string) => void;
  readonly selectFirst: (key: string | undefined) => void;
  readonly goToItems: (action: () => void) => void;
  readonly applySeeder: (key: string, seeder: Seeder, toCategory: string) => Promise<void>;
  readonly deleteSeeder: (key: string) => Promise<void>;
  readonly openDialog: (dialog: Dialog) => void;
  readonly closeDialog: () => void;
  readonly createCategory: (name: string) => Promise<void>;
  readonly createSeeder: (category: string, name: string) => Promise<void>;
  readonly undo: () => void;
  readonly save: () => Promise<void>;
};

/** Reads a thrown value as a message. Low, Sonar 1. */
const readMessage = (error: unknown): string => (error instanceof Error
  ? error.message
  : String(error));

/** Keeps only the seeder keys inside the picked categories. Low, Sonar 1. */
const keepInScope = (seeders: readonly string[], categories: readonly string[]): readonly string[] =>
  categories.length === 0
    ? seeders
    : seeders.filter((key) => categories.includes(readSeederCategory(key)));

/** Swaps one seeder key for another. Low, Sonar 1. */
const renameKey = (keys: readonly string[], from: string, to: string): readonly string[] =>
  keys.map((key) => (key === from
    ? to
    : key));

/** Reads the key of the seeder an entry wrote. Low, Sonar 1. */
const readWrittenKey = (entry: WalEntry | undefined): string | undefined => (entry?.after === undefined
  ? undefined
  : formatSeederKey(entry.toCategory ?? entry.category, entry.after.name));

/** Mirrors main's state, with the items its categories generate. Low, Sonar 0. */
function mirror(panel: PanelState): Pick<Store, "loaded" | "pending"> {
  const items = panel.categories.flatMap(generateItems);
  const { pending, ...version } = panel;

  return { pending, loaded: { ...version, items, itemCounts: countItemsBySeeder(items) } };
}

const userKey = loadUserKey();
let queue: Promise<unknown> = Promise.resolve();

export const usePanel = create<Store>()((set, get) => ({
  loaded: undefined,
  pending: [],
  error: undefined,
  pickedCategories: [],
  pickedSeeders: [],
  query: "",
  view: "items",
  selected: undefined,
  dialog: undefined,
  saving: false,
  dirty: false,
  leaveAction: undefined,

  dispatch: (command) => {
    const result = queue.then(async () => {
      try {
        const proof = await signProof(await userKey, command);
        const panel = await window.panel.dispatch(command, proof);

        set({ ...mirror(panel), error: undefined });
        return command.type === "save"
          ? undefined
          : panel.pending.at(-1);
      } catch (error) {
        set({ error: readMessage(error) });
        return undefined;
      }
    });

    queue = result;
    return result;
  },

  load: async () => {
    try {
      set(mirror(await window.panel.load()));
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

  applySeeder: async (key, seeder, toCategory) => {
    const { dispatch } = get();
    const category = readSeederCategory(key);
    const moved = toCategory === category
      ? key
      : readWrittenKey(await dispatch({ type: "moveSeeder", category, seeder: readSeederName(key), toCategory }));

    if (moved === undefined) return;

    const current = findSeeder(get().loaded?.categories ?? [], readSeederCategory(moved), readSeederName(moved));
    const updated = current === undefined || canonicalJson(current) === canonicalJson(seeder)
      ? moved
      : readWrittenKey(await dispatch({ type: "replaceSeeder", category: readSeederCategory(moved), seeder: readSeederName(moved), with: seeder }));

    if (updated === undefined) return;

    set({ pickedSeeders: renameKey(get().pickedSeeders, key, updated), selected: updated, dirty: false });
  },

  deleteSeeder: async (key) => {
    if ((await get().dispatch({ type: "deleteSeeder", category: readSeederCategory(key), seeder: readSeederName(key) })) === undefined) return;

    set({ pickedSeeders: get().pickedSeeders.filter((at) => at !== key), selected: undefined, dirty: false });
  },

  openDialog: (dialog) => get().guard(() => set({ dialog })),
  closeDialog: () => set({ dialog: undefined }),

  createCategory: async (name) => {
    if ((await get().dispatch({ type: "createCategory", names: [name] })) === undefined) return;

    set({ pickedCategories: [name], pickedSeeders: [], selected: undefined, dirty: false, view: "seeders", dialog: undefined });
  },

  createSeeder: async (category, name) => {
    const entry = await get().dispatch({ type: "createSeeder", category, names: [name] });

    if (entry === undefined) return;

    const { pickedCategories } = get();
    const inScope = pickedCategories.length === 0 || pickedCategories.includes(category);

    set({
      pickedCategories: inScope
        ? pickedCategories
        : [...pickedCategories, category],
      selected: readWrittenKey(entry),
      dirty: false,
      view: "seeders",
      dialog: undefined,
    });
  },

  undo: () => void get().dispatch({ type: "undo" }),

  save: async () => {
    set({ saving: true });
    await get().dispatch({ type: "save" });
    set({ saving: false });
  },
}));
