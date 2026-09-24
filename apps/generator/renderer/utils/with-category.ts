import type { CategoryConfig, GeneratorConfig } from "../../api/generator-api.ts";
import { categoryConfig } from "./category-config.ts";

/** The config with one category's settings changed. */
export const withCategory = (
  config: GeneratorConfig,
  key: string,
  change: (category: CategoryConfig) => CategoryConfig,
): GeneratorConfig => ({
  ...config,
  categories: { ...config.categories, [key]: change(categoryConfig(config, key)) },
});
