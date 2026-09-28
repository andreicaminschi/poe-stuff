import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import { compileFilterEvery } from "@poe/filter-eval/match-filter";
import { blindsOf } from "./find-fall-through/blinds-of.ts";
import { judgePlacement } from "./find-fall-through/judge-placement.ts";
import { judgeReject } from "./find-fall-through/judge-reject.ts";
import { overlapsOf } from "./find-fall-through/overlaps-of.ts";
import { rowLookup } from "./find-fall-through/row-lookup.ts";
import { groupBlind, groupHits, groupRejected } from "./find-fall-through/tally.ts";
import type { Blind, Hit, Rejected } from "./find-fall-through/types.ts";
import { variedProperties } from "./find-fall-through/varied-properties.ts";
import { buildSamples } from "./build-samples.ts";
import { formatPath } from "./build-samples/format-path.ts";
import { sampleSets } from "./build-samples/sample-sets.ts";
import type { FallThroughReport, SampleCategories, SampleRow, UnfilteredReport, UnfilteredRow } from "./types.ts";

export type FilterCheck = {
  readonly unfiltered: UnfilteredReport;
  readonly fallThrough: FallThroughReport;
};

const unsampledOf = (rows: readonly SampleRow[], categories: SampleCategories): readonly string[] =>
  [
    ...new Set(
      rows.filter((row) => sampleSets(categories, row.category, row.subcategory) === undefined).map(formatPath),
    ),
  ].sort();

/**
 * Both reports off one walk of the samples and one compiled matcher.
 *
 * Unfiltered: every sample no block takes, grouped by the row that built it. A `Hide` block
 * counts as taking a sample; only falling off the end of the filter does not.
 *
 * Fall-through: every sample whose own path does not cleanly take it. A sample belongs to a
 * path, because sample sets do. Each is sorted into one bucket: unfiltered, own-miss (no row
 * on its path matches), fall-through (another path wins) or overlap (another path also
 * matches). A catch-all path may overlap its own category's rows, but never win over them.
 * Its own samples are not judged: a fallback exists to take what the rows before it miss. A
 * sample its own path wins is also blind when the winning block asks nothing about a
 * property the path's samples vary. A reject sample is only asked one thing: whether its own
 * path takes it, which is reported as rejected.
 */
export function checkFilter(
  blocks: readonly FilterBlock[],
  rows: readonly SampleRow[],
  categories: SampleCategories,
): FilterCheck {
  const match = compileFilterEvery(blocks);
  const rowOf = rowLookup(rows);
  const keys = new Set(rows.map((row) => row.key));
  const isKey = (key: string) => keys.has(key);

  const byRow = new Map<string, { readonly row: SampleRow; readonly samples: FilterItem[] }>();
  const hits: Hit[] = [];
  const blinds: Blind[] = [];
  const rejected: Rejected[] = [];
  const varied = new Map<string, readonly string[]>();
  let sampled = 0;
  let unfiltered = 0;
  let judged = 0;
  let judgedUnfiltered = 0;

  for (const { row, item, reject } of buildSamples(rows, categories)) {
    const catchAll = categories[formatPath(row)]?.catchAll === true;
    if (reject !== undefined) {
      if (catchAll) continue;
      const taken = judgeReject(row, item, reject, match(item).winner, rowOf);
      if (taken !== undefined) rejected.push(taken);
      continue;
    }

    sampled++;
    const result = match(item);
    if (result.winner === undefined) {
      unfiltered++;
      const entry = byRow.get(row.key);
      if (entry === undefined) byRow.set(row.key, { row, samples: [item] });
      else entry.samples.push(item);
    }
    if (catchAll) continue;

    judged++;
    const placement = judgePlacement(row, item, result, rowOf);
    if (placement.kind === "unfiltered") {
      judgedUnfiltered++;
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

  const unfilteredRows: UnfilteredRow[] = [...byRow.values()].map(({ row, samples }) => ({
    key: row.key,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    samples,
  }));

  return {
    unfiltered: { sampled, unfiltered, unsampled: unsampledOf(rows, categories), rows: unfilteredRows },
    fallThrough: {
      sampled: judged,
      unfiltered: judgedUnfiltered,
      ownMiss: groupHits(hits, "ownMiss"),
      fallThrough: groupHits(hits, "fallThrough"),
      overlap: groupHits(hits, "overlap"),
      rejected: groupRejected(rejected, isKey),
      blind: groupBlind(blinds, isKey),
    },
  };
}
