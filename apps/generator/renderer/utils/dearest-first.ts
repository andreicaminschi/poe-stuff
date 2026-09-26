import type { Placement } from "@poe/filter-style/types";

/** What a placement is worth: its stack floor, or the price its verb reads. */
export const placementWorth = (one: Placement): number => one.stack?.floor ?? one.item.prices[one.verb] ?? 0;

export const dearestFirst = (placements: readonly Placement[]): readonly Placement[] =>
  [...placements].sort((a, b) => placementWorth(b) - placementWorth(a));
