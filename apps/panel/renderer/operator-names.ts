import { CONDITIONS, type ConditionKind } from "@poe/filter-eval/filter-ast";
import type { ConditionOperator } from "@poe/panel-state/types";

const EQUALITY: readonly ConditionOperator[] = ["=", "==", "!="];
const EVERY: readonly ConditionOperator[] = ["=", "==", "!=", "<", "<=", ">", ">=", "range"];
const TEXT_KINDS: readonly ConditionKind[] = ["boolean", "strings", "enums"];

const kindOf = (condition: string): ConditionKind | undefined =>
  (CONDITIONS as unknown as Readonly<Record<string, { readonly kind: ConditionKind }>>)[condition]?.kind;

const isText = (condition: string): boolean => {
  const kind = kindOf(condition);
  return kind !== undefined && TEXT_KINDS.includes(kind);
};

/** The operators the grammar lets this condition take, plus `range` for comparable ones. */
export const listOperators = (condition: string): readonly ConditionOperator[] =>
  (isText(condition)
    ? EQUALITY
    : EVERY);

const NAMES: Readonly<Record<Exclude<ConditionOperator, "=">, string>> = {
  "==": "exactly",
  "!": "not",
  "!=": "not",
  "<": "less than",
  "<=": "at most",
  ">": "more than",
  ">=": "at least",
  range: "between",
};

/** The friendly name of an operator on this condition. */
export function nameOperator(operator: ConditionOperator, condition: string): string {
  if (operator !== "=") return NAMES[operator];
  if (kindOf(condition) === "boolean") return "is";
  return isText(condition)
    ? "contains"
    : "equals";
}
