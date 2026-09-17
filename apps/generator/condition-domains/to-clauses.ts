import type { Condition } from "@poe/filter-compile/types";
import {
  CONDITIONS,
  CONDITIONS_BY_LOWER,
  NEGATING_OPERATORS,
  type ConditionName,
} from "@poe/filter-eval/filter-ast";
import type { Clause, ClauseResult } from "./types.ts";

const SET_KINDS: readonly string[] = ["boolean", "ordered", "strings", "enums"];

const NEGATING: readonly string[] = NEGATING_OPERATORS;

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((one) => typeof one === "string");

function setValues(value: Condition["value"]): readonly string[] | undefined {
  if (typeof value === "boolean") return [value ? "True" : "False"];
  if (typeof value === "string" && value.length > 0) return [value];
  if (isStringList(value) && value.length > 0) return value;

  return undefined;
}

function rangeClause(name: ConditionName, condition: Condition): Clause | string {
  const { value, operator } = condition;

  if (typeof value !== "number") return `${name} has no number to take a range from`;
  if (operator === ">=") return { kind: "range", min: value };
  if (operator === "<=") return { kind: "range", max: value };
  if (operator === undefined || operator === "==" || operator === "=") {
    return { kind: "range", min: value, max: value };
  }

  return `${name} compares with "${operator}", which has no closed range`;
}

function clauseOf(name: ConditionName, condition: Condition): Clause | string {
  if (condition.operator !== undefined && NEGATING.includes(condition.operator)) {
    return `${name} is negated, which has no domain`;
  }

  const { kind } = CONDITIONS[name];

  if (kind === "numeric") return rangeClause(name, condition);

  if (SET_KINDS.includes(kind)) {
    if (condition.operator !== undefined && !["==", "="].includes(condition.operator)) {
      return `${name} compares with "${condition.operator}", which is not a value set`;
    }

    const values = setValues(condition.value);

    return values === undefined
      ? `${name} has no value to take a domain from`
      : { kind: "set", values };
  }

  return `${name} compares as ${kind}, which does not normalize`;
}

function intersect(held: Clause, fresh: Clause): Clause {
  if (held.kind === "set" || fresh.kind === "set") {
    if (held.kind !== "set" || fresh.kind !== "set") return held;

    return { kind: "set", values: held.values.filter((one) => fresh.values.includes(one)) };
  }

  const min = held.min === undefined ? fresh.min : Math.max(held.min, fresh.min ?? held.min);
  const max = held.max === undefined ? fresh.max : Math.min(held.max, fresh.max ?? held.max);

  return {
    kind: "range",
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

/**
 * One form's conditions folded into one clause per condition name.
 *
 * `ItemLevel >= 85` and `ItemLevel <= 85` are two lines and one clause, which is what makes
 * two forms comparable. A condition that cannot be a set or a range is left out and named in
 * `problems`.
 */
export function toClauses(conditions: readonly Condition[]): ClauseResult {
  const clauses: Record<string, Clause> = {};
  const problems: string[] = [];

  for (const condition of conditions) {
    const name = CONDITIONS_BY_LOWER.get(condition.condition.toLowerCase());

    if (name === undefined) {
      problems.push(`"${condition.condition}" is not a filter condition`);
      continue;
    }

    const made = clauseOf(name, condition);

    if (typeof made === "string") {
      problems.push(made);
      continue;
    }

    const held = clauses[name];

    clauses[name] = held === undefined ? made : intersect(held, made);
  }

  return { clauses, problems };
}
