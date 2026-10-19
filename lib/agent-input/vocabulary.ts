import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import { VALUE_SETS } from "@poe/panel-state/value-sets";

/** The words a Filler answer may use: condition names, and the value set names per condition. */
export type Vocabulary = {
  readonly conditions: readonly string[];
  readonly valueSets: Readonly<Record<string, readonly string[]>>;
};

type RegisteredCondition = { readonly games: readonly string[] };

/** Every PoE1 filter condition, and the named value sets. */
export const VOCABULARY: Vocabulary = {
  conditions: Object.entries(CONDITIONS as unknown as Readonly<Record<string, RegisteredCondition>>).filter(([, condition]) => condition.games.includes("poe1")).map(([name]) => name),
  valueSets: Object.fromEntries(Object.entries(VALUE_SETS).map(([condition, sets]) => [condition, Object.keys(sets)])),
};
