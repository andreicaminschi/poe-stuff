import { CONDITIONS, CONDITIONS_BY_LOWER, type ConditionKind } from "@poe/filter-eval/filter-ast";
import type { Condition } from "./types.ts";

export type LineResult = { readonly line: string } | { readonly problem: string };

type Value = string | number | boolean | readonly string[];

/** Writes a string or string list as quoted values, or nothing when one cannot be quoted. */
function writeList(value: Value): string | undefined {
  if (typeof value === "number" || typeof value === "boolean") return undefined;

  const values = typeof value === "string"
    ? [value]
    : value;
  if (values.length === 0 || values.some((one) => one === "" || one.includes("\""))) return undefined;

  return values.map((one) => `"${one}"`).join(" ");
}

/** Writes a string or number unquoted, as socket values are. */
function writeBare(value: Value): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);

  return undefined;
}

/** Writes values from a fixed order, such as rarities, unquoted, or nothing when one is unknown. */
function writeOrdered(value: Value, order: readonly string[]): string | undefined {
  if (typeof value === "number" || typeof value === "boolean") return undefined;

  const values = typeof value === "string"
    ? value.split(/\s+/)
    : value;
  if (values.length === 0 || values.some((one) => !order.includes(one))) return undefined;

  return values.join(" ");
}

/** Writes a boolean as `True` or `False`. */
function writeBoolean(value: Value): string | undefined {
  if (typeof value !== "boolean") return undefined;

  return value
    ? "True"
    : "False";
}

/** Writes a gem condition's value, which is either a boolean or a list of names. */
const writeGemValue = (value: Value): string | undefined =>
  typeof value === "boolean"
    ? writeBoolean(value)
    : writeList(value);

/**
 * Writes a condition's value the way its kind is written in a `.filter`, or nothing when the
 * value does not fit the kind.
 *
 * @example
 * writeValue("list", ["Ruby Ring", "Iron Ring"], []);   // → '"Ruby Ring" "Iron Ring"'
 * writeValue("numeric", 20, []);                        // → "20"
 * writeValue("ordered", "Rare", ["Normal", "Magic", "Rare", "Unique"]); // → "Rare"
 * writeValue("boolean", "yes", []);                     // → undefined
 */
function writeValue(kind: ConditionKind, value: Value, order: readonly string[]): string | undefined {
  if (kind === "boolean") return writeBoolean(value);
  if (kind === "numeric") return typeof value === "number"
    ? String(value)
    : undefined;
  if (kind === "ordered") return writeOrdered(value, order);
  if (kind === "sockets") return writeBare(value);
  if (kind === "gem") return writeGemValue(value);

  return writeList(value);
}

/**
 * One resolved condition as the `.filter` line that asks it, or why it cannot be one.
 *
 * The condition's kind comes from `@poe/filter-eval`'s registry. Strings are quoted, numbers
 * and ordered or socket values are bare, and booleans are `True` or `False`. The operator is
 * written only when the condition carries one.
 *
 * @example
 * writeConditionLine({ condition: "basetype", operator: "==", value: ["Ruby Ring"] });
 * // → { line: 'BaseType == "Ruby Ring"' }
 * writeConditionLine({ condition: "GemLevel", operator: ">=", value: "high" });
 * // → { problem: 'GemLevel cannot hold "high"' }
 */
export function writeConditionLine(condition: Condition): LineResult {
  const name = CONDITIONS_BY_LOWER.get(condition.condition.toLowerCase());
  if (name === undefined) return { problem: `"${condition.condition}" is not a filter condition` };

  const { value } = condition;
  if (value === undefined || value === null) return { problem: `${name} has no value` };

  const spec = CONDITIONS[name];
  const order = "order" in spec
    ? spec.order
    : [];
  const text = writeValue(spec.kind, value, order);
  if (text === undefined) return { problem: `${name} cannot hold ${JSON.stringify(value)}` };

  const operator = condition.operator === undefined
    ? ""
    : `${condition.operator} `;

  return { line: `${name} ${operator}${text}` };
}

/** Every condition as a line, or the first reason one cannot be written. */
export function writeConditionLines(
  conditions: readonly Condition[],
): { readonly lines: readonly string[] } | { readonly problem: string } {
  const lines: string[] = [];
  for (const result of conditions.map(writeConditionLine)) {
    if ("problem" in result) return result;
    lines.push(result.line);
  }
  if (lines.some((line) => line.includes("#"))) return { problem: "has a # in a value, which would start a comment" };

  return { lines };
}
