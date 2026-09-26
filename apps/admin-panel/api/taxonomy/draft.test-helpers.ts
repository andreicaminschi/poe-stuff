import type { AuthoredItem, Category, GggItem, Variant } from "./types.ts";

export const gggItem = (key: string, extra: Partial<GggItem> = {}): GggItem => ({
  source: "ggg",
  key,
  name: key,
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
  ...extra,
});

export const authoredItem = (key: string, extra: Partial<AuthoredItem> = {}): AuthoredItem => ({
  source: "authored",
  key,
  name: key,
  baseType: "Leather Belt",
  classification: { category: "unique", subcategory: "regular" },
  reason: "a unique",
  replaces: [],
  conditions: [],
  variants: [],
  ...extra,
});

export const category = (path: string, extra: Partial<Category> = {}): Category => ({
  path,
  tiering: "chaos",
  conditions: [],
  ...extra,
});

export const variant = (name: string): Variant => ({ name, conditions: [{ condition: "Corrupted", value: true }] });
