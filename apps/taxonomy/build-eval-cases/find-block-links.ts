import { readOwnerNote } from "@poe/filter-compile/owner-note";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher } from "@poe/filter-eval/match-filter";
import type { LinkRow, PoeWatchLink } from "./types.ts";

/**
 * Finds a non-unique item's PoeWatch entry: the compiled filter picks the block that takes
 * the item, and the block's row or variant carries the entry.
 * Answers `[]` when no block takes the item or the entry has no price.
 */
export function findBlockLinks(
  item: FilterItem,
  filterMatcher: FilterMatcher,
  rowsByKey: ReadonlyMap<string, LinkRow>,
): readonly PoeWatchLink[] {
  const winner = filterMatcher(item).winner;
  if (winner === undefined) return [];
  const owner = readOwnerNote(winner.freehand, (key) => rowsByKey.has(key));
  if (owner === undefined) return [];
  const row = rowsByKey.get(owner.key);
  if (row === undefined) return [];

  const link =
    owner.variant === undefined
      ? row.poeWatch
      : row.variants?.find((variant) => variant.name === owner.variant)?.poeWatch;
  return link === undefined
    ? []
    : [link];
}
