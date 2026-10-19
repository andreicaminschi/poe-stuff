import type { Command } from "@poe/panel-state/execute-command";
import { create } from "zustand";
import type { AgentPlan, ModelRun, Notes, PanelView, Result } from "../contract.ts";

export type Mode = "seeders" | "items";

export type Dialog =
  | { readonly kind: "newCategory" }
  | { readonly kind: "newSeeder"; readonly category: string }
  | { readonly kind: "rename"; readonly target: "category" | "seeder"; readonly name: string }
  | { readonly kind: "merge"; readonly category: string }
  | { readonly kind: "confirm"; readonly message: string; readonly command: Command };

/** Everything the renderer holds. Only `view` mirrors main; the rest is UI state and never a command. */
export type Store = {
  readonly view: PanelView | undefined;
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly models: readonly ModelRun[];
  readonly run: string;
  readonly plan: AgentPlan | undefined;
  readonly planning: boolean;
  readonly mode: Mode;
  readonly pickedCategories: readonly string[];
  readonly pickedSeeders: readonly string[];
  readonly selectedSeeder: string | undefined;
  readonly selectedItem: string | undefined;
  readonly itemQuery: string;
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
  readonly toggleSeeder: (name: string) => void;
  readonly clearFilters: () => void;
  readonly selectSeeder: (name: string | undefined) => void;
  readonly selectItem: (name: string | undefined) => void;
  readonly setItemQuery: (query: string) => void;
  readonly openDialog: (dialog: Dialog) => void;
  readonly closeDialog: () => void;
};

const toggle = (list: readonly string[], name: string): readonly string[] =>
  (list.includes(name)
    ? list.filter((entry) => entry !== name)
    : [...list, name]);

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

  /** Takes a new view from main. */
  async function apply(request: () => Promise<Result<PanelView>>): Promise<boolean> {
    const view = await call(request);
    if (view === undefined) return false;
    set({ view });
    return true;
  }

  return {
    view: undefined,
    error: undefined,
    busy: false,
    models: [],
    run: "",
    plan: undefined,
    planning: false,
    mode: "seeders",
    pickedCategories: [],
    pickedSeeders: [],
    selectedSeeder: undefined,
    selectedItem: undefined,
    itemQuery: "",
    dialog: undefined,

    load: async () => {
      await apply(() => window.panel["panel:view"]());
    },
    dispatch: (command) => apply(() => window.panel["panel:dispatch"](command)),
    undo: async () => {
      await apply(() => window.panel["panel:undo"]());
    },
    save: async () => {
      await apply(() => window.panel["panel:save"]());
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
      if (await apply(() => window.panel["agent:approve"](plan.id, [...steps], notes))) set({ plan: undefined });
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
    toggleSeeder: (name) => set({ pickedSeeders: toggle(get().pickedSeeders, name) }),
    clearFilters: () => set({ pickedCategories: [], pickedSeeders: [] }),
    selectSeeder: (name) => set({ selectedSeeder: name }),
    selectItem: (name) => set({ selectedItem: name }),
    setItemQuery: (itemQuery) => set({ itemQuery }),
    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set({ dialog: undefined }),
  };
});
