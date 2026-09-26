import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import { compileFilterEvery } from "@poe/filter-eval/match-filter";
import { ownerOf } from "./find-fall-through/owner-of.ts";
import { variedProperties } from "./find-fall-through/varied-properties.ts";
import { samplesOf } from "./samples-of.ts";
import { pathOf } from "./samples-of/path-of.ts";
import type { BlindGroup, FallThroughReport, RejectedGroup, PathPair, SampleCategories, SampleRow } from "./types.ts";

type Bucket = "ownMiss" | "fallThrough" | "overlap";

type Hit = {
  readonly bucket: Bucket;
  readonly own: SampleRow;
  readonly other: SampleRow | undefined;
  readonly item: FilterItem;
};

function group(hits: readonly Hit[], bucket: Bucket): readonly PathPair[] {
  const pairs = new Map<string, PathPair>();
  for (const { own, other, item } of hits.filter((hit) => hit.bucket === bucket)) {
    const otherPath = other === undefined ? "" : pathOf(other);
    const id = `${pathOf(own)}\n${otherPath}`;
    const entry = pairs.get(id);
    pairs.set(
      id,
      entry === undefined
        ? { own: pathOf(own), other: otherPath, count: 1, example: { ownKey: own.key, otherKey: other?.key ?? "", item } }
        : { ...entry, count: entry.count + 1 },
    );
  }
  return [...pairs.values()].sort((a, b) => b.count - a.count);
}

type Blind = { readonly row: SampleRow; readonly block: FilterBlock; readonly property: string; readonly item: FilterItem };

function groupBlind(blinds: readonly Blind[]): readonly BlindGroup[] {
  const groups = new Map<string, BlindGroup>();
  for (const { row, block, property, item } of blinds) {
    const id = `${pathOf(row)}\n${property}`;
    const entry = groups.get(id);
    groups.set(
      id,
      entry === undefined
        ? {
            path: pathOf(row),
            property,
            count: 1,
            example: { key: row.key, variant: block.freehand.split(" ").slice(1).join(" "), item },
          }
        : { ...entry, count: entry.count + 1 },
    );
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

type Rejected = { readonly row: SampleRow; readonly block: FilterBlock; readonly reject: string; readonly item: FilterItem };

function groupRejected(rejected: readonly Rejected[]): readonly RejectedGroup[] {
  const groups = new Map<string, RejectedGroup>();
  for (const { row, block, reject, item } of rejected) {
    const id = `${pathOf(row)}\n${reject}`;
    const entry = groups.get(id);
    groups.set(
      id,
      entry === undefined
        ? {
            path: pathOf(row),
            reject,
            count: 1,
            example: { key: row.key, variant: block.freehand.split(" ").slice(1).join(" "), item },
          }
        : { ...entry, count: entry.count + 1 },
    );
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function isCatchAll(categories: SampleCategories, own: SampleRow, other: SampleRow): boolean {
  return other.category === own.category && categories[pathOf(other)]?.catchAll === true;
}

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
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  const rowOf = (block: FilterBlock | undefined): SampleRow | undefined => {
    const key = block === undefined ? undefined : ownerOf(block);
    return key === undefined ? undefined : rowsByKey.get(key);
  };

  const hits: Hit[] = [];
  const blinds: Blind[] = [];
  const rejected: Rejected[] = [];
  const varied = new Map<string, readonly string[]>();
  let sampled = 0;
  let unfiltered = 0;

  for (const { row, item, reject } of samplesOf(rows, categories)) {
    if (categories[pathOf(row)]?.catchAll === true) continue;
    if (reject !== undefined) {
      const taken = match(item).winner;
      const takenRow = rowOf(taken);
      if (taken !== undefined && takenRow !== undefined && pathOf(takenRow) === pathOf(row)) {
        rejected.push({ row, block: taken, reject, item });
      }
      continue;
    }
    sampled++;
    const { winner, matched } = match(item);
    if (winner === undefined) {
      unfiltered++;
      continue;
    }

    const owners = [...new Set(matched.map(rowOf))].filter((one) => one !== undefined);
    const path = pathOf(row);
    const winnerRow = rowOf(winner);

    if (!owners.some((one) => pathOf(one) === path)) {
      hits.push({ bucket: "ownMiss", own: row, other: winnerRow, item });
      continue;
    }
    if (winnerRow === undefined || pathOf(winnerRow) !== path) {
      hits.push({ bucket: "fallThrough", own: row, other: winnerRow, item });
      continue;
    }
    const properties = varied.get(row.key) ?? variedProperties(categories, row);
    varied.set(row.key, properties);
    for (const property of properties) {
      if (!winner.conditions.some((one) => one.name === property)) blinds.push({ row, block: winner, property, item });
    }

    const others = new Map(owners.filter((one) => pathOf(one) !== path).map((one) => [pathOf(one), one]));
    for (const other of others.values()) {
      if (!isCatchAll(categories, row, other)) hits.push({ bucket: "overlap", own: row, other, item });
    }
  }

  return {
    sampled,
    unfiltered,
    ownMiss: group(hits, "ownMiss"),
    fallThrough: group(hits, "fallThrough"),
    overlap: group(hits, "overlap"),
    rejected: groupRejected(rejected),
    blind: groupBlind(blinds),
  };
}
