import type { Draft } from "../../api/taxonomy.types.ts";
import type { Changes } from "../types.ts";

function overlay<T>(
  base: Readonly<Record<string, T>>,
  over: Readonly<Record<string, T | null>>,
): Record<string, T> {
  const next: Record<string, T> = { ...base };

  for (const [key, value] of Object.entries(over)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }

  return next;
}

export const applyChanges = (draft: Draft, changes: Changes): Draft => ({
  ...draft,
  items: { ...draft.items, ...changes.items },
  categories: overlay(draft.categories, changes.categories),
});
