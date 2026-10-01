import type { Category, Seeder, WalEntry } from "../types.ts";

/** Returns the seeders with `before` swapped for `after`: in place, removed, or appended. Low, Sonar 3. */
function swapSeeder(seeders: readonly Seeder[], before: Seeder | undefined, after: Seeder | undefined): readonly Seeder[] {
  if (before === undefined) return after === undefined
    ? seeders
    : [...seeders, after];

  return seeders.flatMap((seeder) => {
    if (seeder.name !== before.name) return [seeder];
    return after === undefined
      ? []
      : [after];
  });
}

/**
 * Returns the categories with one log entry applied. `before` leaves `category` and `after`
 * enters `toCategory`, which defaults to `category`. Within one category the swap is in place;
 * across two, `after` is appended to the target. Low, Sonar 4.
 */
export function applyEntry(categories: readonly Category[], entry: WalEntry): readonly Category[] {
  if (entry.op === "createCategory") return [...categories, { name: entry.category, seeders: [] }];
  if (entry.op === "deleteCategory") return categories.filter((category) => category.name !== entry.category);

  const target = entry.toCategory ?? entry.category;

  return categories.map((category) => {
    const isSource = category.name === entry.category;
    const isTarget = category.name === target;

    if (isSource && isTarget) return { ...category, seeders: swapSeeder(category.seeders, entry.before, entry.after) };
    if (isSource) return { ...category, seeders: swapSeeder(category.seeders, entry.before, undefined) };
    if (isTarget) return { ...category, seeders: swapSeeder(category.seeders, undefined, entry.after) };
    return category;
  });
}

/**
 * Finds the newest edit not yet undone. Undo entries are skipped, so repeated undos walk back
 * through the history instead of toggling. Low, Sonar 1.
 */
export function findUndoable(log: readonly WalEntry[]): WalEntry | undefined {
  const undone = new Set(log.flatMap((entry) => (entry.undoes === undefined
    ? []
    : [entry.undoes])));

  return log.findLast((entry) => entry.undoes === undefined && !undone.has(entry.id));
}

/** Builds the entry that reverts another: seeders and categories swapped. Low, Sonar 1. */
export function invertEntry(entry: WalEntry, id: string, at: string): WalEntry {
  if (entry.op === "createCategory") return { id, at, category: entry.category, op: "deleteCategory", undoes: entry.id };
  if (entry.op === "deleteCategory") return { id, at, category: entry.category, op: "createCategory", undoes: entry.id };

  const target = entry.toCategory ?? entry.category;

  return {
    id,
    at,
    category: target,
    ...(target === entry.category
      ? {}
      : { toCategory: entry.category }),
    ...(entry.after === undefined
      ? {}
      : { before: entry.after }),
    ...(entry.before === undefined
      ? {}
      : { after: entry.before }),
    undoes: entry.id,
  };
}
