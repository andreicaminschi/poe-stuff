import type { Category, Item, PanelState } from "@poe/panel-state/types";

/** One top-level key's value before and after. `null` means absent, so a patch stays JSON. */
export type Change<T> = { readonly before: T | null; readonly after: T | null };

/** What one command changed, per top-level category and item. Enough to apply or undo it. */
export type Patch = {
  readonly categories: Readonly<Record<string, Change<Category>>>;
  readonly items: Readonly<Record<string, Change<Item>>>;
};

type Changes<T> = Readonly<Record<string, Change<T>>>;

// commands copy only what they change
const isSame = (left: unknown, right: unknown): boolean => left === right || JSON.stringify(left) === JSON.stringify(right);

/** Lists every key whose value differs between two maps. */
function diffRecords<T>(before: Readonly<Record<string, T>>, after: Readonly<Record<string, T>>): Changes<T> {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return Object.fromEntries(keys.flatMap((key) => {
    const was = before[key] ?? null;
    const now = after[key] ?? null;
    return isSame(was, now)
      ? []
      : [[key, { before: was, after: now }] as const];
  }));
}

/** Returns the patch that turns `before` into `after`. */
export const diffState = (before: PanelState, after: PanelState): Patch => ({
  categories: diffRecords(before.categories, after.categories),
  items: diffRecords(before.items, after.items),
});

/** Tells whether a patch changes nothing. */
export const isEmptyPatch = (patch: Patch): boolean =>
  Object.keys(patch.categories).length === 0 && Object.keys(patch.items).length === 0;

/** Returns the map with every change's `after` written in, and `null` keys removed. */
function writeChanges<T>(record: Readonly<Record<string, T>>, changes: Changes<T>): Readonly<Record<string, T>> {
  const written = { ...record };

  for (const [key, change] of Object.entries(changes)) {
    if (change.after === null) delete written[key];
    else written[key] = change.after;
  }
  return written;
}

/** Returns the state with the patch applied. */
export const applyPatch = (state: PanelState, patch: Patch): PanelState => ({
  categories: writeChanges(state.categories, patch.categories),
  items: writeChanges(state.items, patch.items),
});

/** Swaps each change's sides. */
const swapChanges = <T>(changes: Changes<T>): Changes<T> =>
  Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, { before: change.after, after: change.before }]));

/** Returns the patch that undoes this one. */
export const invertPatch = (patch: Patch): Patch => ({
  categories: swapChanges(patch.categories),
  items: swapChanges(patch.items),
});
