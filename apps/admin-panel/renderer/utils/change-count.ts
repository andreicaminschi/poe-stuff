import type { Changes } from "../types.ts";

export const changeCount = (changes: Changes): number =>
  Object.keys(changes.items).length + Object.keys(changes.categories).length;
