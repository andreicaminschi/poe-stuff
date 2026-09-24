import type { Catalog } from "./catalog/getCatalog.api.ts";
import type { CategoryConfig, GeneratorConfig } from "./config/types.ts";
import type { SavedFilter } from "./filter/saveFilter.api.ts";

export type GeneratorApi = {
  getCatalog(): Promise<Catalog>;
  getConfig(): Promise<GeneratorConfig>;
  saveConfig(config: GeneratorConfig): Promise<void>;
  saveFilter(text: string): Promise<SavedFilter>;
};

export const API_NAMES = [
  "getCatalog",
  "getConfig",
  "saveConfig",
  "saveFilter",
] as const satisfies readonly (keyof GeneratorApi)[];

export const LEAGUE = "Allflame";

export { DEFAULT_CONFIG, FALLBACK_PALETTE, STACK_FLOORS } from "./config/default-config.ts";

export type { Catalog, CategoryConfig, GeneratorConfig, SavedFilter };
