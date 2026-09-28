import { readOwnerNote } from "@poe/filter-compile/owner-note";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher } from "@poe/filter-eval/match-filter";
import type { EntryRow, MarketEntry } from "./types.ts";

/**
 * Finds a non-unique item's market entry: the compiled filter picks the block that takes
 * the item, and the block's row or variant carries the entry.
 * Answers `[]` when no block takes the item or the entry has no price.
 *
 * The winning block's owner note is `<key>` or `<key> <variant>`. Keys may hold spaces, so
 * the note is split at the longest key `rowsByKey` knows.
 *
 * @example
 * const rowsByKey = new Map([["Ruby Ring", {
 *   key: "Ruby Ring", name: "Ruby Ring", poeWatch: rubyRing,
 *   variants: [{ name: "ilvl 84", poeWatch: rubyRing84 }],
 * }]]);
 *
 * // winning block note: "Ruby Ring"
 * findBlockEntries({ BaseType: "Ruby Ring", ItemLevel: 70 }, filterMatcher, rowsByKey);
 * // → [rubyRing]
 *
 * // winning block note: "Ruby Ring ilvl 84", split as key "Ruby Ring", variant "ilvl 84"
 * findBlockEntries({ BaseType: "Ruby Ring", ItemLevel: 84 }, filterMatcher, rowsByKey);
 * // → [rubyRing84]
 */
export function findBlockEntries(
  item: FilterItem,
  filterMatcher: FilterMatcher,
  rowsByKey: ReadonlyMap<string, EntryRow>,
): readonly MarketEntry[] {
  const winner = filterMatcher(item).winner;
  if (winner === undefined) return [];

  const owner = readOwnerNote(winner.freehand, (key) => rowsByKey.has(key));
  if (owner === undefined) return [];

  const row = rowsByKey.get(owner.key);
  if (row === undefined) return [];

  const entry =
    owner.variant === undefined
      ? row.poeWatch
      : row.variants?.find((variant) => variant.name === owner.variant)?.poeWatch;
  return entry === undefined
    ? []
    : [entry];
}
