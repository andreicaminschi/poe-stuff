import type { CorruptionOutcome } from "./types.ts";

/**
 * Every priced corruption outcome for one item.
 *
 * `item_id` joins to `ItemData.id` in `get-compact-data.types.ts`, though not every id
 * resolves: the two
 * endpoints are separate snapshots, and 6 of the sample's 1,989 ids were absent from the
 * compact dump taken alongside it. Only four categories appear at all — `armour`,
 * `weapons`, `accessories` and `jewels`.
 */
export type ItemCorruptions = {
  readonly item_id: number;
  readonly corruptions: readonly CorruptionOutcome[];
};
