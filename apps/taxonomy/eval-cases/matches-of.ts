import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher } from "@poe/filter-eval/match-filter";

export type PoeWatchLink = {
  readonly source: "poeWatch:items" | "poeWatch:exchange";
  readonly id: number | null;
  readonly name: string;
};

type UniqueGroup = {
  readonly subcategory: string | null;
  readonly listings: readonly { readonly corrupted: boolean; readonly poeWatch: PoeWatchLink }[];
};

/** What the matcher reads off a catalog row. */
export type LinkRow = {
  readonly key: string;
  readonly name: string;
  readonly poeWatch?: PoeWatchLink;
  readonly variants?: readonly { readonly name: string; readonly poeWatch?: PoeWatchLink }[];
  readonly uniques?: readonly UniqueGroup[];
};

const FOULBORN = "foulborn";

/** Every unique listing on the item's base, in the item's form. */
function uniqueMatches(item: FilterItem, basesByName: ReadonlyMap<string, LinkRow>): readonly PoeWatchLink[] {
  const base = typeof item.BaseType === "string" ? basesByName.get(item.BaseType) : undefined;
  const subcategory = item.Foulborn === true ? FOULBORN : null;
  const corrupted = item.Corrupted === true;

  return (base?.uniques ?? [])
    .filter((group) => group.subcategory === subcategory)
    .flatMap((group) => group.listings)
    .filter((listing) => listing.corrupted === corrupted)
    .map((listing) => listing.poeWatch);
}

/** The block's row, or its variant: the freehand is `<key>` or `<key> <variant>`. */
function blockMatches(freehand: string, rowsByKey: ReadonlyMap<string, LinkRow>): readonly PoeWatchLink[] {
  const [key = "", ...rest] = freehand.split(" ");
  const row = rowsByKey.get(key);
  if (row === undefined) return [];

  const variant = rest.join(" ");
  const link = variant === "" ? row.poeWatch : row.variants?.find((one) => one.name === variant)?.poeWatch;
  return link === undefined ? [] : [link];
}

/**
 * The PoeWatch entries a sample item is.
 *
 * A unique is any unique its base carries, in the same form. Anything else is the first
 * block that takes it. Nothing takes it, or nothing priced it, is `[]`.
 */
export function matchesOf(
  item: FilterItem,
  match: FilterMatcher,
  rowsByKey: ReadonlyMap<string, LinkRow>,
  basesByName: ReadonlyMap<string, LinkRow>,
): readonly PoeWatchLink[] {
  if (item.Rarity === "Unique") return uniqueMatches(item, basesByName);

  const winner = match(item).winner;
  return winner === undefined ? [] : blockMatches(winner.freehand, rowsByKey);
}
