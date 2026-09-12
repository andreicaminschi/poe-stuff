import { CONDITIONS, CONDITIONS_BY_LOWER, type ConditionKind } from "@poe/filter-eval/filter-ast";
import type { Condition } from "./types.ts";

export type LineResult = { readonly line: string } | { readonly problem: string };

type Value = string | number | boolean | readonly string[];

function listText(value: Value): string | undefined {
  if (typeof value === "number" || typeof value === "boolean") return undefined;

  const values = typeof value === "string" ? [value] : value;
  if (values.length === 0 || values.some((one) => one.includes('"'))) return undefined;

  return values.map((one) => `"${one}"`).join(" ");
}

function bareText(value: Value): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);

  return undefined;
}

function orderedText(value: Value): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value.length === 0) return undefined;

  return value.join(" ");
}

function booleanText(value: Value): string | undefined {
  if (typeof value !== "boolean") return undefined;

  return value ? "True" : "False";
}

function gemText(value: Value): string | undefined {
  if (typeof value === "boolean") return booleanText(value);

  return listText(value);
}

function valueText(kind: ConditionKind, value: Value): string | undefined {
  if (kind === "boolean") return booleanText(value);
  if (kind === "numeric") return typeof value === "number" ? String(value) : undefined;
  if (kind === "ordered") return orderedText(value);
  if (kind === "sockets") return bareText(value);
  if (kind === "gem") return gemText(value);

  return listText(value);
}

/**
 * One resolved condition as the `.filter` line that asks it, or why it cannot be one.
 *
 * The condition's kind comes from `@poe/filter-eval`'s registry. Strings are quoted, numbers
 * and ordered or socket values are bare, and booleans are `True` or `False`. The operator is
 * written only when the condition carries one.
 */
export function conditionLine(condition: Condition): LineResult {
  const name = CONDITIONS_BY_LOWER.get(condition.condition.toLowerCase());
  if (name === undefined) return { problem: `"${condition.condition}" is not a filter condition` };

  const { value } = condition;
  if (value === undefined || value === null) return { problem: `${name} has no value` };

  const text = valueText(CONDITIONS[name].kind, value);
  if (text === undefined) return { problem: `${name} cannot hold ${JSON.stringify(value)}` };

  const operator = condition.operator === undefined ? "" : `${condition.operator} `;

  return { line: `${name} ${operator}${text}` };
}
