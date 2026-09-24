import { tierStyle } from "@poe/filter-style/tier-style";
import { HIDDEN, TIERS, WANT, type Style, type Verb } from "@poe/filter-style/types";
import type { PlacedCategory } from "../hooks/use-all-placed.ts";
import { worthText } from "./worth-text.ts";

export const UNPLACED = "Unplaced";

export type Hit = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly bucket: string;
  readonly verb?: Verb;
  readonly won: boolean;
  readonly worth: string;
  readonly style?: Style;
  readonly reason: string;
};

const ORDER: readonly string[] = [WANT, ...TIERS, HIDDEN, UNPLACED];

/** Every tier an item whose name holds the query lands in, then what no tier took. */
export function searchPlacements(categories: readonly PlacedCategory[], query: string): readonly Hit[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  const matches = (name: string) => name.toLowerCase().includes(needle);

  const hits = categories.flatMap(({ key, name, palette, placed }) => [
    ...placed.placed
      .filter((one) => matches(one.item.name))
      .map((one, at): Hit => ({
        id: `${key}|${one.item.key}|${one.item.variant ?? ""}|${one.bucket}|${one.verb}|${at}`,
        name: one.item.name,
        category: name,
        bucket: one.bucket,
        verb: one.verb,
        won: one.won,
        worth: worthText(one),
        style: tierStyle(palette, one.bucket, one.verb),
        reason: one.reason,
      })),
    ...placed.unplaced
      .filter((one) => matches(one.item.name))
      .map((one, at): Hit => ({
        id: `${key}|${one.item.key}|${one.item.variant ?? ""}|unplaced|${at}`,
        name: one.item.name,
        category: name,
        bucket: UNPLACED,
        won: false,
        worth: "-",
        reason: one.reason,
      })),
  ]);

  return hits.sort((a, b) => ORDER.indexOf(a.bucket) - ORDER.indexOf(b.bucket) || a.name.localeCompare(b.name));
}
