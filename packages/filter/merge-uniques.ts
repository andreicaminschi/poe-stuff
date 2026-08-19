import type { UniqueItem } from "@poe/ggg/types";
import type { WikiUniqueItem } from "@poe/poe-wiki/types";
import type { FilterUnique } from "./types.ts";

/**
 * GGG's unique list, with the wiki's drop restriction laid over it.
 *
 * **GGG decides which uniques exist.** It is what the game ships and the trade site
 * searches, so a unique the wiki has and GGG does not is a wiki artefact — a removed
 * item, a rename, a page for something that never shipped — and is dropped.
 *
 * **The wiki decides one field.** `restrictedDrop` is editorial judgement about whether
 * an item can drop from the general pool at all, and it exists in no GGG payload. Also
 * taken from the wiki: `category`, because GGG's grouping stops at "Accessories" and a
 * check bucket needs to know a ring from a belt.
 *
 * **Uncertainty resolves to `false`.** No wiki row, no wiki call, contradictory wiki
 * rows — all of them mean unrestricted. That is the loud direction: an unrestricted
 * unique stays in its base's check bucket and can only raise that bucket's ceiling. Get
 * it wrong and the filter shows a Viridian Jewel it did not need to; get the safe-looking
 * opposite wrong and it hides the one that was Headhunter.
 *
 * Names repeat — nine Atziri's Splendour rows, four Aul's Uprising — so a name is only
 * restricted when *every* row carrying it is. One droppable variant is enough.
 */
export function mergeUniques(
  ggg: readonly UniqueItem[],
  wiki: readonly WikiUniqueItem[],
): readonly FilterUnique[] {
  const restricted = new Map<string, boolean>();
  const categories = new Map<string, string>();

  for (const row of wiki) {
    const seen = restricted.get(row.name);
    // `&&` rather than `||`: one droppable row makes the name droppable.
    restricted.set(row.name, (seen ?? true) && row.restrictedDrop);
    if (!categories.has(row.name)) categories.set(row.name, row.category);
  }

  return ggg.map(({ name, type }) => ({
    name,
    baseType: type,
    category: categories.get(name) ?? "unknown",
    restrictedDrop: restricted.get(name) ?? false,
  }));
}
