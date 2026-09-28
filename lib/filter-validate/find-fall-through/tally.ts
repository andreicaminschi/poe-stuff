import { readOwnerNote } from "@poe/filter-compile/owner-note";
import { formatPath } from "../build-samples/format-path.ts";
import type { BlindGroup, PathPair, RejectedGroup, SampleRow } from "../types.ts";
import type { Blind, Bucket, Flagged, Hit, Rejected } from "./types.ts";

/** One group per id, counted, the first entry's shape kept, most counted first. */
function tally<T, G extends { readonly count: number }>(
  entries: readonly T[],
  idOf: (entry: T) => string,
  groupOf: (entry: T) => G,
): readonly G[] {
  const groups = new Map<string, G>();
  for (const entry of entries) {
    const id = idOf(entry);
    const earlier = groups.get(id);
    groups.set(id, earlier === undefined
      ? groupOf(entry)
      : { ...earlier, count: earlier.count + 1 });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

const formatOtherPath = (other: SampleRow | undefined): string => (other === undefined
  ? ""
  : formatPath(other));

export const groupHits = (hits: readonly Hit[], bucket: Bucket): readonly PathPair[] =>
  tally(
    hits.filter((hit) => hit.bucket === bucket),
    ({ own, other }) => `${formatPath(own)}\n${formatOtherPath(other)}`,
    ({ own, other, item }) => ({
      own: formatPath(own),
      other: formatOtherPath(other),
      count: 1,
      example: { ownKey: own.key, otherKey: other?.key ?? "", item },
    }),
  );

type IsKey = (key: string) => boolean;

const exampleOf = ({ row, block, item }: Flagged, isKey: IsKey) => ({
  key: row.key,
  variant: readOwnerNote(block.freehand, isKey)?.variant ?? "",
  item,
});

export const groupBlind = (blinds: readonly Blind[], isKey: IsKey): readonly BlindGroup[] =>
  tally(
    blinds,
    ({ row, property }) => `${formatPath(row)}\n${property}`,
    (blind) => ({ path: formatPath(blind.row), property: blind.property, count: 1, example: exampleOf(blind, isKey) }),
  );

export const groupRejected = (rejected: readonly Rejected[], isKey: IsKey): readonly RejectedGroup[] =>
  tally(
    rejected,
    ({ row, reject }) => `${formatPath(row)}\n${reject}`,
    (one) => ({ path: formatPath(one.row), reject: one.reject, count: 1, example: exampleOf(one, isKey) }),
  );
