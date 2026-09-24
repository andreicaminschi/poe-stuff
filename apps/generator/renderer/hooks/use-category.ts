import type { CategoryRecord } from "@poe/filter-style/types";
import type { CategoryConfig } from "../../api/generator-api.ts";
import { useSession } from "../session-store.ts";
import { categoryConfig } from "../utils/category-config.ts";

export type SelectedCategory = {
  readonly key: string;
  readonly name: string;
  readonly record: CategoryRecord | undefined;
  readonly config: CategoryConfig;
};

/** The selected category: its taxonomy record and its generator settings. */
export function useCategory(): SelectedCategory | undefined {
  const catalog = useSession((state) => state.catalog);
  const config = useSession((state) => state.config);
  const key = useSession((state) => state.category);
  if (catalog === undefined || config === undefined || key === undefined) return undefined;

  const record = catalog.categories[key];
  return { key, name: record?.name ?? key, record, config: categoryConfig(config, key) };
}
