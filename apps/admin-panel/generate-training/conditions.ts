import type { Faker } from "@faker-js/faker";
import { CONDITION_KINDS, CONDITION_NAMES, FROM_CODE, PSEUDO_VALUES, SHORTHANDS } from "../condition-values.ts";

/** A condition request: the words the query uses, the real condition, and the sentinel the agent must write. */
export type SampledCondition = { readonly key: string; readonly word: string; readonly text: string; readonly sentinel: string };

const WITH_DEFAULT = new Set(["boolean", "ordered", "enums"]);
const SHORTHAND_SHARE = 0.4;
const PSEUDO_SHARE = 0.5;

const hasDefault = (condition: string): boolean => WITH_DEFAULT.has(CONDITION_KINDS[condition] ?? "");

/** Conditions a request can name: those with an all-values default, or with pseudo-values. */
const SAMPLEABLE = CONDITION_NAMES.filter((name) => hasDefault(name) || PSEUDO_VALUES[name] !== undefined);

/** The word a person types for a condition: its name, or one of its shorthands. Low, Sonar 1. */
function pickWord(faker: Faker, condition: string): string {
  const shorthands = Object.entries(SHORTHANDS).filter(([, name]) => name === condition).map(([word]) => word);
  return shorthands.length > 0 && faker.datatype.boolean(SHORTHAND_SHARE)
    ? faker.helpers.arrayElement(shorthands)
    : condition;
}

/**
 * Samples a condition request. The query names the condition, maybe by shorthand, and maybe a
 * pseudo-value; the label is always the sentinel, never a value. Low, Sonar 2.
 */
export function sampleCondition(faker: Faker): SampledCondition {
  const condition = faker.helpers.arrayElement(SAMPLEABLE);
  const word = pickWord(faker, condition);
  const pseudo = Object.keys(PSEUDO_VALUES[condition] ?? {});
  const usePseudo = pseudo.length > 0 && (!hasDefault(condition) || faker.datatype.boolean(PSEUDO_SHARE));

  if (!usePseudo) return { key: condition, word, text: word, sentinel: FROM_CODE };

  const parameter = faker.helpers.arrayElement(pseudo);
  return { key: condition, word, text: `${parameter} ${word}`, sentinel: `${FROM_CODE}${parameter}` };
}
