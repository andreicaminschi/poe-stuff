import { en, Faker } from "@faker-js/faker";

/** Derives the seed of one named draw from its owner's seed, so every draw is fixed by the goal's seed and its own label. */
export function deriveSeed(seed: number, label: string): number {
  let hash = (2166136261 ^ seed) >>> 0;

  for (const char of label) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

/** Builds a faker whose random sequence is fixed by the seed. The caller owns it. */
export const createFaker = (seed: number): Faker => new Faker({ locale: [en], seed });
