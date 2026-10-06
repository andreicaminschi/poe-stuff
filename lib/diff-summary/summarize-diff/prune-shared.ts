import type { Tree } from "../types.ts";
import { isRecord } from "./is-record.ts";

type Pair = { readonly before: Tree; readonly after: Tree };

/**
 * Drops every branch that is the very same object on both sides, keeping key order, so microdiff
 * only walks what a step could have changed. A command copies only the maps it changes, so an
 * untouched category or the whole item map is shared and drops out. microdiff gives the same
 * changes on the pruned pair as on the full one, because nothing it drops could differ.
 *
 * @example
 * pruneShared({ a: shared, b: { x: 1 } }, { a: shared, b: { x: 2 } });
 * // → { before: { b: { x: 1 } }, after: { b: { x: 2 } } }
 */
export function pruneShared(before: Tree, after: Tree): Pair {
  const keptBefore: [string, unknown][] = [];
  const keptAfter: [string, unknown][] = [];

  for (const [key, value] of Object.entries(before)) {
    const other = after[key];
    if (value === other) continue;
    if (isRecord(value) && isRecord(other)) {
      const pruned = pruneShared(value, other);
      keptBefore.push([key, pruned.before]);
      keptAfter.push([key, pruned.after]);
      continue;
    }
    keptBefore.push([key, value]);
    if (key in after) keptAfter.push([key, other]);
  }
  for (const [key, value] of Object.entries(after)) {
    if (!(key in before)) keptAfter.push([key, value]);
  }
  return { before: Object.fromEntries(keptBefore), after: Object.fromEntries(keptAfter) };
}
