import { itemsOf } from "@poe/filter-style/items-of";
import type { BucketName, Item, Palette, TierName } from "@poe/filter-style/types";
import { writeFilter } from "@poe/filter-style/write-filter";
import { create } from "zustand";
import { STACK_FLOORS, type Catalog, type GeneratorConfig } from "../api/generator-api.ts";
import { categoryConfig } from "./utils/category-config.ts";
import { categoryPlans } from "./utils/category-plans.ts";
import { topCategories } from "./utils/top-categories.ts";
import { withCategory } from "./utils/with-category.ts";

export type Screen = "tiers" | "simulate";

export type Session = {
  readonly booting: boolean;
  readonly busy: boolean;
  readonly error?: string;
  readonly status?: string;
  readonly catalog?: Catalog;
  readonly items: readonly Item[];
  readonly config?: GeneratorConfig;
  readonly saved?: GeneratorConfig;
  readonly category?: string;
  readonly bucket: BucketName | null;
  readonly screen: Screen;

  boot(): Promise<void>;
  selectCategory(key: string): void;
  selectBucket(bucket: BucketName | null): void;
  setScreen(screen: Screen): void;
  editCategory(change: (config: GeneratorConfig, key: string) => GeneratorConfig): void;
  toggleTier(tier: TierName): void;
  setPalette(palette: Palette): void;
  setFloor(tier: TierName, value: number): void;
  addWanted(name: string): void;
  removeWanted(name: string): void;
  saveConfig(): Promise<void>;
  writeFilter(): Promise<void>;
  dismissError(): void;
};

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const useSession = create<Session>((set, get) => ({
  booting: true,
  busy: false,
  items: [],
  bucket: null,
  screen: "tiers",

  async boot() {
    try {
      const [catalog, config] = await Promise.all([window.generator.getCatalog(), window.generator.getConfig()]);
      const items = itemsOf(catalog.rows);
      const [category] = topCategories(items);
      set({ catalog, items, config, saved: config, booting: false, ...(category === undefined ? {} : { category }) });
    } catch (error) {
      set({ booting: false, error: message(error) });
    }
  },

  selectCategory: (category) => set({ category, bucket: null }),
  selectBucket: (bucket) => set({ bucket }),
  setScreen: (screen) => set({ screen }),

  editCategory(change) {
    const { config, category } = get();
    if (config === undefined || category === undefined) return;
    set({ config: change(config, category) });
  },

  toggleTier(tier) {
    get().editCategory((config, key) =>
      withCategory(config, key, (one) => ({
        ...one,
        disabled: one.disabled.includes(tier) ? one.disabled.filter((name) => name !== tier) : [...one.disabled, tier],
      })),
    );
  },

  setPalette(palette) {
    get().editCategory((config, key) => withCategory(config, key, (one) => ({ ...one, palette })));
  },

  setFloor(tier, value) {
    const { config, category, catalog } = get();
    if (config === undefined || category === undefined || catalog === undefined) return;

    const own = categoryConfig(config, category).floors !== undefined;
    const stack = catalog.categories[category]?.tiering === "stack-size";
    if (!own && !stack) {
      set({ config: { ...config, floors: { ...config.floors, [tier]: value } } });
      return;
    }
    set({
      config: withCategory(config, category, (one) => ({ ...one, floors: { ...(one.floors ?? STACK_FLOORS), [tier]: value } })),
    });
  },

  addWanted(name) {
    get().editCategory((config, key) =>
      withCategory(config, key, (one) => (one.wanted.includes(name) ? one : { ...one, wanted: [...one.wanted, name] })),
    );
  },

  removeWanted(name) {
    get().editCategory((config, key) =>
      withCategory(config, key, (one) => ({ ...one, wanted: one.wanted.filter((other) => other !== name) })),
    );
  },

  async saveConfig() {
    const { config } = get();
    if (config === undefined) return;

    set({ busy: true });
    try {
      await window.generator.saveConfig(config);
      set({ saved: config, status: "Config saved." });
    } catch (error) {
      set({ error: message(error) });
    } finally {
      set({ busy: false });
    }
  },

  async writeFilter() {
    const { catalog, items, config } = get();
    if (catalog === undefined || config === undefined) return;

    set({ busy: true });
    try {
      const written = writeFilter({ rows: catalog.rows, categories: catalog.categories, plans: categoryPlans(items, catalog.categories, config) });
      const saved = await window.generator.saveFilter(written.text);
      const skipped = written.skipped.length === 0 ? "" : `, ${written.skipped.length} skipped`;
      if ("path" in saved) set({ status: `Wrote ${written.blocks.length} blocks${skipped} to ${saved.path}` });
    } catch (error) {
      set({ error: message(error) });
    } finally {
      set({ busy: false });
    }
  },

  dismissError: () => set({ error: undefined }),
}));
