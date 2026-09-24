import { place } from "@poe/filter-style/place";
import type { CategoryRecord, Item } from "@poe/filter-style/types";
import type { CategoryPlan } from "@poe/filter-style/write-filter";
import type { GeneratorConfig } from "../../api/generator-api.ts";
import { categoryConfig } from "./category-config.ts";
import { placeOptions } from "./place-options.ts";
import { topCategories } from "./top-categories.ts";

/** Every category placed and paired with its palette, ready to write. */
export function categoryPlans(
  items: readonly Item[],
  categories: Readonly<Record<string, CategoryRecord>>,
  config: GeneratorConfig,
): readonly CategoryPlan[] {
  return topCategories(items).map((key) => ({
    palette: categoryConfig(config, key).palette,
    placed: place(
      items.filter((item) => item.category === key),
      placeOptions(config, key, categories[key]),
    ),
  }));
}
