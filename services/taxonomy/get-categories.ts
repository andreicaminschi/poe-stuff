import type { Lake } from "@poe/lake/types";
import { categoriesKey, latestCategoriesKey } from "./config.ts";
import { TaxonomyNotFoundError } from "./errors.ts";
import type { TaxonomyCategories } from "./get-categories.types.ts";

export async function getCategories(
  lake: Lake,
  prefix: string,
  version?: string,
): Promise<TaxonomyCategories> {
  const key = version === undefined ? latestCategoriesKey(prefix) : categoriesKey(prefix, version);

  if (!(await lake.exists(key))) throw new TaxonomyNotFoundError(key);

  return lake.readJson<TaxonomyCategories>(key);
}
