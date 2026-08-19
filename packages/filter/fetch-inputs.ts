import { getUniqueItems as getGggUniques } from "@poe/ggg/get-unique-items";
import { createLimiter } from "@poe/ggg/rate-limiter";
import { getCompactData } from "@poe/poe-watch/get-compact-data";
import { getCorruptionData } from "@poe/poe-watch/get-corruption-data";
import { getExchangeRatios } from "@poe/poe-watch/get-exchange-ratios";
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
 * The four calls that can go in parallel do. Only GGG is paced, and only because it is
 * GGG: one request through a limiter, where PoeWatch and the wiki publish no budget.
 */

/**
 * Where the limiter starts for the one GGG call.
 *
 * This process makes a single request, so the opening rule is the only rule it will ever
 * pace against — GGG's own headers arrive too late to matter.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

export type FetchedInput = ClassifyInput & {
  /** What each source actually returned, for the CLI to report. */
  readonly counts: {
    readonly items: number;
    readonly corruptions: number;
    readonly exchange: number;
    readonly ggg: number;
    readonly wiki: number;
  };
};

export async function fetchInputs(league: string): Promise<FetchedInput> {
  const [items, corruptions, exchange, ggg, wiki] = await Promise.all([
    getCompactData(league),
    getCorruptionData(league),
    getExchangeRatios(league, "poe1"),
    getGggUniques({ limiter: createLimiter(OPENING_RULES) }),
    getWikiUniques(),
  ]);

  return {
    items,
    corruptions,
    exchange,
    uniques: mergeUniques(ggg, wiki),
    counts: {
      items: items.length,
      corruptions: corruptions.length,
      exchange: exchange.length,
      ggg: ggg.length,
      wiki: wiki.length,
    },
  };
}
