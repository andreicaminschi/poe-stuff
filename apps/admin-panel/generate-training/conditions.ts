import type { Faker } from "@faker-js/faker";
import type { ConditionFormat } from "../format-context.ts";
import type { ConditionValue } from "../types.ts";

/** A condition the generator can write, with a sampled value and how the query says it. */
export type SampledCondition = { readonly key: string; readonly values: readonly ConditionValue[]; readonly text: string };

const RARITIES = ["Normal", "Magic", "Rare", "Unique"];
const FLAGS = ["Fractured", "Corrupted", "Mirrored", "Synthesised", "Identified"];
const RANGES = [
  { key: "ItemLevel", min: 1, max: 86 },
  { key: "Quality", min: 0, max: 30 },
  { key: "Sockets", min: 0, max: 6 },
  { key: "LinkedSockets", min: 0, max: 6 },
  { key: "AreaLevel", min: 1, max: 85 },
];

export const CONDITION_FORMATS: readonly ConditionFormat[] = [
  ...FLAGS.map((key) => ({ key, values: "true, false or both" })),
  ...RANGES.map(({ key, min, max }) => ({ key, values: `a range from ${String(min)} to ${String(max)}` })),
  { key: "Rarity", values: `one or more of ${RARITIES.join(", ")}` },
];

/** Samples a flag: true, false or both. Low, Sonar 1. */
function sampleFlag(faker: Faker, key: string): SampledCondition {
  const values = faker.helpers.arrayElement<readonly boolean[]>([[true], [false], [true, false]]);

  return { key, values, text: values.map(String).join("/") };
}

/** Samples a range inside the condition's bounds. Low, Sonar 0. */
function sampleRange(faker: Faker, key: string, min: number, max: number): SampledCondition {
  const low = faker.number.int({ min, max });
  const high = faker.number.int({ min: low, max });

  return { key, values: [[low, high]], text: `${String(low)}-${String(high)}` };
}

/** Samples one or two rarities. Low, Sonar 0. */
function sampleRarity(faker: Faker): SampledCondition {
  const values = faker.helpers.arrayElements(RARITIES, { min: 1, max: 2 });

  return { key: "Rarity", values, text: values.join("/") };
}

/** Samples a condition and a value for it. Low, Sonar 2. */
export function sampleCondition(faker: Faker): SampledCondition {
  const kind = faker.helpers.arrayElement(["flag", "range", "rarity"]);

  if (kind === "flag") return sampleFlag(faker, faker.helpers.arrayElement(FLAGS));
  if (kind === "rarity") return sampleRarity(faker);

  const range = faker.helpers.arrayElement(RANGES);
  return sampleRange(faker, range.key, range.min, range.max);
}
