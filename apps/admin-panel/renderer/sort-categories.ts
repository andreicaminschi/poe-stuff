import type { Category } from "../types.ts";

/** Returns the categories sorted by name, for the screen. */
export const sortCategories = (categories: readonly Category[]): readonly Category[] =>
  categories.toSorted((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
