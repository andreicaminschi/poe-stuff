import type { Category, WalEntry } from "../types.ts";

/**
 * Returns the categories with one log entry applied: the `before` seeder is replaced by `after`
 * in place, removed when there is no `after`, and `after` is appended when there is no
 * `before`. Low, Sonar 3.
 */
export function applyEntry(categories: readonly Category[], entry: WalEntry): readonly Category[] {
  return categories.map((category) => {
    if (category.name !== entry.category) return category;
    if (entry.before === undefined) return entry.after === undefined
      ? category
      : { ...category, seeders: [...category.seeders, entry.after] };

    const beforeName = entry.before.name;
    const seeders = category.seeders.flatMap((seeder) => {
      if (seeder.name !== beforeName) return [seeder];
      return entry.after === undefined
        ? []
        : [entry.after];
    });

    return { ...category, seeders };
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

/** Builds the entry that reverts another: `before` and `after` swapped. Low, Sonar 0. */
export const invertEntry = (entry: WalEntry, id: string, at: string): WalEntry => ({
  id,
  at,
  category: entry.category,
  ...(entry.after === undefined
    ? {}
    : { before: entry.after }),
  ...(entry.before === undefined
    ? {}
    : { after: entry.before }),
  undoes: entry.id,
});
