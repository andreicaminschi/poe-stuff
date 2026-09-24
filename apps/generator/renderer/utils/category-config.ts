import { FALLBACK_PALETTE, type CategoryConfig, type GeneratorConfig } from "../../api/generator-api.ts";

export const categoryConfig = (config: GeneratorConfig, key: string): CategoryConfig =>
  config.categories[key] ?? { palette: FALLBACK_PALETTE, disabled: [], wanted: [] };
