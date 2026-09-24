import type { Loot } from "./loot-pool.ts";

const CHEAPEST = 0.5;

/** Cheap things drop far more often than dear ones, so each pick weighs 1 / worth. */
export function weightedPick(pool: readonly Loot[], random: () => number = Math.random): Loot | undefined {
  const weights = pool.map((one) => 1 / Math.max(one.worth, CHEAPEST));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let left = random() * total;

  for (const [at, weight] of weights.entries()) {
    left -= weight;
    if (left <= 0) return pool[at];
  }
  return pool[pool.length - 1];
}
