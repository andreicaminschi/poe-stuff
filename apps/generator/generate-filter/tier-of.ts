import type { Tier } from "./types.ts";

/** Tiers from the loudest down: the highest floor first. */
export const byFloor = (tiers: readonly Tier[]): readonly Tier[] =>
  [...tiers].sort((a, b) => b.min - a.min);

/** The highest tier whose floor the price reaches, or null when it is under every one. */
export const tierOf = (price: number, tiers: readonly Tier[]): Tier | null =>
  byFloor(tiers).find((tier) => price >= tier.min) ?? null;
