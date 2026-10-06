import type { ConditionValues } from "@poe/panel-state/types";
import { VALUE_SETS } from "@poe/panel-state/value-sets";
import { createFaker, deriveSeed } from "./derive-seed.ts";
import { formatList } from "./word.ts";

/** A condition edit, and how a person says it. */
export type ConditionChange = {
  readonly condition: string;
  readonly value: ConditionValues;
  readonly phrase: string;
};

/** How a person says each yes/no condition when it is true. */
const BOOLEAN_WORDS: Readonly<Record<string, string>> = {
  Corrupted: "corrupted",
  FracturedItem: "fractured",
  Mirrored: "mirrored",
  Identified: "identified",
  SynthesisedItem: "synthesised",
  Replica: "replica",
  Foulborn: "foulborn",
  AnyEnchantment: "enchanted",
  ShaperItem: "shaper",
  ElderItem: "elder",
};

/** How a person names each numeric or listed condition. */
const CONDITION_WORDS: Readonly<Record<string, string>> = {
  Rarity: "rarity",
  ItemLevel: "item level",
  Quality: "quality",
  LinkedSockets: "links",
  AreaLevel: "area level",
  MapTier: "map tier",
  HasInfluence: "influence",
  BaseType: "base type",
  EnchantmentPassiveNode: "cluster passive",
  EnchantmentPassiveNum: "passive count",
};

/** The value ranges a literal range edit draws from. */
const RANGES: Readonly<Record<string, readonly [number, number]>> = {
  ItemLevel: [1, 100],
  Quality: [1, 30],
  AreaLevel: [1, 100],
  MapTier: [1, 17],
};

const RARITIES = ["Normal", "Magic", "Rare", "Unique"];
const INFLUENCES = ["Shaper", "Elder", "Crusader", "Hunter", "Redeemer", "Warlord"];

/** Draws a yes/no condition set to true or false. */
function drawBoolean(seed: number): ConditionChange {
  const faker = createFaker(seed);
  const condition = faker.helpers.objectKey(BOOLEAN_WORDS) as string;
  const word = BOOLEAN_WORDS[condition] ?? condition;
  const value = faker.datatype.boolean({ probability: 0.75 });

  return { condition, value: [value], phrase: value
    ? word
    : `not ${word}` };
}

/** Says a named set the way a person does: "item level endgame", "high-quality", "any quality". */
function describeValueSet(word: string, name: string): string {
  if (name === word) return `any ${word}`;
  if (name.includes(word)) return name;
  return `${word} ${name}`;
}

/** Draws a named value set, such as `Rarity non-unique`. */
function drawValueSet(seed: number): ConditionChange {
  const faker = createFaker(seed);
  const condition = faker.helpers.arrayElement(Object.keys(VALUE_SETS).filter((name) => CONDITION_WORDS[name] !== undefined));
  const name = faker.helpers.objectKey(VALUE_SETS[condition] ?? {}) as string;

  return { condition, value: name, phrase: describeValueSet(CONDITION_WORDS[condition] ?? condition, name) };
}

/** Draws a literal range, such as item level 75-86, or one value when both ends meet. */
function drawRange(seed: number): ConditionChange {
  const faker = createFaker(seed);
  const condition = faker.helpers.objectKey(RANGES) as string;
  const [low, high] = RANGES[condition] ?? [1, 100];
  const from = faker.number.int({ min: low, max: high });
  const to = faker.number.int({ min: from, max: high });
  const shown = from === to
    ? String(from)
    : `${from}-${to}`;

  return { condition, value: [`${from}-${to}`], phrase: `${CONDITION_WORDS[condition] ?? condition} ${shown}` };
}

/** Draws a literal list of rarities or influences. */
function drawListed(seed: number): ConditionChange {
  const faker = createFaker(seed);
  const condition = faker.helpers.arrayElement(["Rarity", "HasInfluence"]);
  const values = faker.helpers.arrayElements(condition === "Rarity"
    ? RARITIES
    : INFLUENCES, { min: 1, max: 3 });

  return { condition, value: values, phrase: `${CONDITION_WORDS[condition] ?? condition} ${formatList(values.map((value) => value.toLowerCase()))}` };
}

/** Draws one condition edit of any shape: yes/no, named set, range or listed values. */
export const drawConditionChange = (seed: number): ConditionChange =>
  createFaker(seed).helpers.arrayElement([drawBoolean, drawValueSet, drawRange, drawListed])(deriveSeed(seed, "value"));

/** Names a condition the way a person does. */
export const describeCondition = (condition: string): string =>
  CONDITION_WORDS[condition] ?? BOOLEAN_WORDS[condition] ?? condition;
