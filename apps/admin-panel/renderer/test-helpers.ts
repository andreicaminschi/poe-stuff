import type { AuthoredItem, Category, Draft, GggItem } from "../api/taxonomy/types.ts";

export const ggg = (name: string, over: Partial<GggItem> = {}): GggItem => ({
  source: "ggg",
  key: name,
  name,
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
  ...over,
});

export const authored = (name: string, over: Partial<AuthoredItem> = {}): AuthoredItem => ({
  source: "authored",
  key: name,
  name,
  baseType: name,
  reason: "because",
  replaces: [],
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
  ...over,
});

export const category = (path: string, over: Partial<Category> = {}): Category => ({
  path,
  tiering: "price" as Category["tiering"],
  conditions: [],
  ...over,
});

export const draftOf = (
  items: readonly (GggItem | AuthoredItem)[] = [],
  categories: readonly Category[] = [],
): Draft => ({
  id: "3.29.4",
  items: Object.fromEntries(items.map((item) => [item.key, item])),
  categories: Object.fromEntries(categories.map((one) => [one.path, one])),
});
