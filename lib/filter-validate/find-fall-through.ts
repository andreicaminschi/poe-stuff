import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import { compileFilterEvery } from "@poe/filter-eval/match-filter";
import { blindsOf } from "./find-fall-through/blinds-of.ts";
import { judgePlacement } from "./find-fall-through/judge-placement.ts";
import { judgeReject } from "./find-fall-through/judge-reject.ts";
import { overlapsOf } from "./find-fall-through/overlaps-of.ts";
import { rowLookup } from "./find-fall-through/row-lookup.ts";
import { groupBlind, groupHits, groupRejected } from "./find-fall-through/tally.ts";
import type { Blind, Hit, Rejected } from "./find-fall-through/types.ts";
import { variedProperties } from "./find-fall-through/varied-properties.ts";
import { samplesOf } from "./samples-of.ts";
import { pathOf } from "./samples-of/path-of.ts";
import type { FallThroughReport, SampleCategories, SampleRow } from "./types.ts";

/**
 * Every sample whose own path does not cleanly take it. A sample belongs to a path, because
 * sample sets do. Each is sorted into one bucket: unfiltered, own-miss (no row on its path
 * matches), fall-through (another path wins) or overlap (another path also matches). A
 * catch-all path may overlap its own category's rows, but never win over them. Its own
 * samples are not judged: a fallback exists to take what the rows before it miss. A sample
 * its own path wins is also blind when the winning block asks nothing about a property the
 * path's samples vary. A reject sample is only asked one thing: whether its own path takes
 * it, which is reported as rejected.
 */
export function findFallThrough(
  blocks: readonly FilterBlock[],
  rows: readonly SampleRow[],
  categories: SampleCategories,
): FallThroughReport {
  const match = compileFilterEvery(blocks);
  const rowOf = rowLookup(rows);

  const hits: Hit[] = [];
  const blinds: Blind[] = [];
  const rejected: Rejected[] = [];
  const varied = new Map<string, readonly string[]>();
  let sampled = 0;
  let unfiltered = 0;

  for (const { row, item, reject } of samplesOf(rows, categories)) {
    if (categories[pathOf(row)]?.catchAll === true) continue;
    if (reject !== undefined) {
      const taken = judgeReject(row, item, reject, match, rowOf);
      if (taken !== undefined) rejected.push(taken);
      continue;
    }
    sampled++;
    const placement = judgePlacement(row, item, match, rowOf);
    if (placement.kind === "unfiltered") {
      unfiltered++;
      continue;
    }
    if (placement.kind === "miss") {
      hits.push(placement.hit);
      continue;
    }
    const properties = varied.get(row.key) ?? variedProperties(categories, row);
    varied.set(row.key, properties);
    blinds.push(...blindsOf(row, placement.winner, item, properties));
    hits.push(...overlapsOf(row, placement.owners, item, categories));
  }

  return {
    sampled,
    unfiltered,
    ownMiss: groupHits(hits, "ownMiss"),
    fallThrough: groupHits(hits, "fallThrough"),
    overlap: groupHits(hits, "overlap"),
    rejected: groupRejected(rejected),
    blind: groupBlind(blinds),
  };
}
