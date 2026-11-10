import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";
import { create } from "zustand";
import type { AgentPlan, ModelRun, Notes, PanelView, Result } from "../contract.ts";
import { listItemRows, type ItemRow } from "./list-item-rows.ts";
import { nextItemRows } from "./next-item-rows.ts";

export type Mode = "items" | "categories" | "tagSeeders";

/** Which tag seeder the editor shows: a stored one by name, or a new draft. */
export type TagSeederPick = { readonly kind: "stored"; readonly name: string } | { readonly kind: "new" };

export type FilterSection = "category" | "seeder" | "tag";

export type Dialog =
  | { readonly kind: "newCategory" }
  | { readonly kind: "newSeeder"; readonly category: string }
  | { readonly kind: "rename"; readonly target: "category" | "seeder"; readonly name: string }
  | { readonly kind: "confirm"; readonly message: string; readonly command: Command }
  | { readonly kind: "picker"; readonly section: FilterSection }
  | { readonly kind: "item"; readonly key: string };

/** Everything the renderer holds. Only `view` mirrors main; the rest is UI state and never a command. */
export type Store = {
  readonly view: PanelView | undefined;
  /** Kept across tab switches. */
  readonly itemRows: readonly ItemRow[];
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly models: readonly ModelRun[];
  readonly run: string;
  readonly plan: AgentPlan | undefined;
  readonly planning: boolean;
  readonly mode: Mode;
  readonly pickedCategories: readonly string[];
  readonly pickedSeeders: readonly string[];
  readonly pickedTags: readonly string[];
  readonly searchQuery: string;
  readonly selectedSeeder: string | undefined;
  readonly tagSeederPick: TagSeederPick | undefined;
  readonly tagSeederSearch: string;
  readonly dialog: Dialog | undefined;

  readonly load: () => Promise<void>;
  readonly dispatch: (command: Command) => Promise<boolean>;
  readonly undo: () => Promise<void>;
  readonly save: () => Promise<void>;
  readonly loadModels: () => Promise<void>;
  readonly setRun: (run: string) => void;
  readonly ask: (request: string) => Promise<void>;
  readonly approve: (steps: readonly Command[], notes: Notes) => Promise<void>;
  readonly reject: (notes: Notes) => Promise<void>;
  readonly dismiss: () => Promise<void>;
  readonly clearError: () => void;
  readonly setMode: (mode: Mode) => void;
  readonly toggleCategory: (name: string) => void;
  /** Picks only this category, or none when it is already the pick. */
  readonly pickCategory: (name: string) => void;
  readonly toggleSeeder: (name: string) => void;
  readonly toggleTag: (name: string) => void;
  readonly clearSection: (section: FilterSection) => void;
  readonly clearFilters: () => void;
  readonly setSearchQuery: (query: string) => void;
  readonly selectSeeder: (name: string | undefined) => void;
  readonly pickTagSeeder: (pick: TagSeederPick | undefined) => void;
  readonly setTagSeederSearch: (query: string) => void;
  readonly openDialog: (dialog: Dialog) => void;
  readonly closeDialog: () => void;
};

const toggle = (list: readonly string[], name: string): readonly string[] =>
  (list.includes(name)
    ? list.filter((entry) => entry !== name)
    : [...list, name]);

/** The store fields that empty one filter section. */
function clearedPicks(section: FilterSection): Partial<Store> {
  if (section === "category") return { pickedCategories: [] };
  if (section === "seeder") return { pickedSeeders: [] };
  return { pickedTags: [] };
}

export const usePanel = create<Store>()((set, get) => {
  /** Runs one IPC call; a failure lands in `error` and returns undefined. */
  async function call<T>(request: () => Promise<Result<T>>): Promise<T | undefined> {
    set({ busy: true });
    const result = await request().catch((error: unknown) => ({ ok: false as const, error: String(error) }));
    set({ busy: false });
    if (!result.ok) {
      set({ error: result.error });
      return undefined;
    }
    set({ error: undefined });
    return result.value;
  }

  /** Takes a new view and its rows. */
  async function apply(request: () => Promise<Result<PanelView>>, rowsOf: (state: PanelState) => readonly ItemRow[]): Promise<boolean> {
    const view = await call(request);
    if (view === undefined) return false;
    set({ view, itemRows: rowsOf(view.state) });
    return true;
  }

  const keepRows = (): readonly ItemRow[] => get().itemRows;
  const rowsAfter = (commands: readonly Command[]) => (state: PanelState): readonly ItemRow[] =>
    nextItemRows(get().itemRows, state, commands);

  return {
    view: undefined,
    itemRows: [],
    error: undefined,
    busy: false,
    models: [],
    run: "",
    plan: undefined,
    planning: false,
    mode: "items",
    pickedCategories: [],
    pickedSeeders: [],
    pickedTags: [],
    searchQuery: "",
    selectedSeeder: undefined,
    tagSeederPick: undefined,
    tagSeederSearch: "",
    dialog: undefined,

    load: async () => {
      await apply(() => window.panel["panel:view"](), listItemRows);
    },
    dispatch: (command) => apply(() => window.panel["panel:dispatch"](command), rowsAfter([command])),
    undo: async () => {
      await apply(() => window.panel["panel:undo"](), listItemRows);
    },
    save: async () => {
      await apply(() => window.panel["panel:save"](), keepRows);
    },

    loadModels: async () => {
      const models = await call(() => window.panel["agent:models"]());
      if (models === undefined) return;
      const { run } = get();
      set({ models, run: models.some((model) => model.run === run)
        ? run
        : (models[0]?.run ?? "") });
    },
    setRun: (run) => set({ run }),

    ask: async (request) => {
      const { run } = get();
      if (run === "") {
        set({ error: "No exported model run. Run apps/agent-training/export.sh first." });
        return;
      }
      set({ planning: true });
      const plan = await call(() => window.panel["agent:plan"](request, run));
      set({ planning: false, ...(plan === undefined
        ? {}
        : { plan }) });
    },
    approve: async (steps, notes) => {
      const { plan } = get();
      if (plan === undefined) return;
      if (await apply(() => window.panel["agent:approve"](plan.id, [...steps], notes), rowsAfter(steps))) set({ plan: undefined });
    },
    reject: async (notes) => {
      const { plan } = get();
      if (plan === undefined) return;
      if ((await call(() => window.panel["agent:reject"](plan.id, notes))) !== undefined) set({ plan: undefined });
    },
    dismiss: async () => {
      const { plan } = get();
      set({ plan: undefined });
      if (plan !== undefined) await call(() => window.panel["agent:dismiss"](plan.id));
    },

    clearError: () => set({ error: undefined }),
    setMode: (mode) => set({ mode }),
    toggleCategory: (name) => set({ pickedCategories: toggle(get().pickedCategories, name) }),
    pickCategory: (name) => {
      const picked = get().pickedCategories;
      set({ pickedCategories: picked.length === 1 && picked[0] === name
        ? []
        : [name] });
    },
    toggleSeeder: (name) => set({ pickedSeeders: toggle(get().pickedSeeders, name) }),
    toggleTag: (name) => set({ pickedTags: toggle(get().pickedTags, name) }),
    clearSection: (section) => set(clearedPicks(section)),
    clearFilters: () => set({ pickedCategories: [], pickedSeeders: [], pickedTags: [], searchQuery: "" }),
    setSearchQuery: (searchQuery) => set({ searchQuery, pickedCategories: [] }),
    selectSeeder: (name) => set({ selectedSeeder: name }),
    pickTagSeeder: (tagSeederPick) => set({ tagSeederPick }),
    setTagSeederSearch: (tagSeederSearch) => set({ tagSeederSearch }),
    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set({ dialog: undefined }),
  };
});
