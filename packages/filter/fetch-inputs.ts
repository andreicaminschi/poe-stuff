import { getItemBases } from "@poe/ggg/get-item-bases";
import { getStaticItems } from "@poe/ggg/get-static-items";
import { getUniqueItems as getGggUniques } from "@poe/ggg/get-unique-items";
import { createLimiter } from "@poe/ggg/rate-limiter";
import type { GggContext, ItemBase, StaticItem, UniqueItem } from "@poe/ggg/types";
import { getCompactData } from "@poe/poe-watch/get-compact-data";
import { getCorruptionData } from "@poe/poe-watch/get-corruption-data";
import { getExchangeRatios } from "@poe/poe-watch/get-exchange-ratios";
import { getExceptionalGems } from "@poe/poe-wiki/get-exceptional-gems";
import { getTransfiguredGems } from "@poe/poe-wiki/get-transfigured-gems";
import { getUniqueItems as getWikiUniques } from "@poe/poe-wiki/get-unique-items";
import type { ClassifyInput } from "./classify.ts";
import { mergeUniques } from "./merge-uniques.ts";

/**
 * Everything the classifier reads, fetched from the APIs that own it.
 *
 * No step here reads a file in the tree. A committed dump goes stale silently and makes a
 * classification nobody can reproduce, so the getters are the only source — each caches to
 * disk with the league and the hour in its key, which makes a re-run within the hour free
 * and a stale entry impossible.
 *
 * The calls that can go in parallel do. Only GGG is paced, and only because it is GGG:
 * every request here goes through one limiter, because a limiter is per-process state and
 * two of them against one IP is twice the real rate on a budget GGG counts as a whole.
 */

/**
 * Where the limiter starts for the GGG calls.
 *
 * This process makes two requests at most, so the opening rule is the only rule it will
 * ever pace against — GGG's own headers arrive too late to matter.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

/** What GGG answers for, in the three shapes the classifier wants it in. */
type GggData = {
  readonly uniques: readonly UniqueItem[];
  readonly bases: readonly ItemBase[];
  readonly statics: readonly StaticItem[];
};

/**
 * The GGG half, in turn rather than together.
 *
 * **`getUniqueItems` and `getItemBases` are two readings of one download.** Both go
 * through `fetchItems`, which caches `/data/items` under an hour key — so awaited in
 * sequence the second one finds what the first one wrote and costs nothing. Run in
 * parallel they would both miss the empty cache and both pull a third of a megabyte, and
 * the limiter would pace them into two requests rather than stopping the second.
 *
 * `/data/static` is its own endpoint and its own entry, so it is a second request whatever
 * happens. It is awaited here too rather than raced beside the others, because the limiter
 * is shared and a queued request is not a faster request.
 */
const fetchGgg = async (context: GggContext): Promise<GggData> => {
  const uniques = await getGggUniques(context);
  const bases = await getItemBases(context);
  const statics = await getStaticItems(context);

  return { uniques, bases, statics };
};

export type FetchedInput = ClassifyInput & {
  /** What each source actually returned, for the CLI to report. */
  readonly counts: {
    readonly items: number;
    readonly corruptions: number;
    readonly exchange: number;
    readonly ggg: number;
    readonly wiki: number;
    readonly itemBases: number;
    readonly staticItems: number;
    readonly exceptionalGems: number;
    readonly transfiguredGems: number;
  };
};

export async function fetchInputs(league: string): Promise<FetchedInput> {
  const [items, corruptions, exchange, ggg, wiki, exceptionalGems, transfiguredGems] =
    await Promise.all([
      getCompactData(league),
      getCorruptionData(league),
      getExchangeRatios(league, "poe1"),
      fetchGgg({ limiter: createLimiter(OPENING_RULES) }),
      getWikiUniques(),
      getExceptionalGems(),
      getTransfiguredGems(),
    ]);

  return {
    items,
    corruptions,
    exchange,
    uniques: mergeUniques(ggg.uniques, wiki),
    itemBases: ggg.bases,
    staticItems: ggg.statics,
    exceptionalGems: exceptionalGems.map((gem) => gem.name),
    transfiguredGems: transfiguredGems.map((gem) => gem.name),
    counts: {
      items: items.length,
      corruptions: corruptions.length,
      exchange: exchange.length,
      ggg: ggg.uniques.length,
      wiki: wiki.length,
      itemBases: ggg.bases.length,
      staticItems: ggg.statics.length,
      exceptionalGems: exceptionalGems.length,
      transfiguredGems: transfiguredGems.length,
    },
  };
}
