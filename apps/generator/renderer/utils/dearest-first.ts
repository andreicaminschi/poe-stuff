import type { Placement } from "@poe/filter-style/types";

const worth = (one: Placement): number => one.stack?.floor ?? one.item.prices[one.verb] ?? 0;

export const dearestFirst = (placements: readonly Placement[]): readonly Placement[] =>
  [...placements].sort((a, b) => worth(b) - worth(a));
