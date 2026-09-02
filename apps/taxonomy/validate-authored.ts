import type { AuthoredRow, AuthoredTable } from "./types.ts";
import { conditionsProblem } from "./validate-conditions.ts";
import { priceProblem } from "./validate-table.ts";

const FIELDS = [
  "name",
  "category",
  "subcategory",
  "replaces",
  "reason",
  "conditions",
  "price",
];

/**
 * The catalog's key rule, restated. It built these keys itself before the table moved here,
 * and a published key has to keep reading the same way.
 */
const slug = (field: string): string =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * `authored/vaal-aspect`. Its own namespace, so it can never collide with a metadata id.
 *
 * The slug is usually of the name, and need not be: two rows may share a name and differ by
 * what they replace. What is checked is the shape — the prefix, and a slug after it.
 */
const PREFIX = "authored/";

const isAuthoredKey = (key: string): boolean =>
  key.startsWith(PREFIX) &&
  key.length > PREFIX.length &&
  slug(key.slice(PREFIX.length)) === key.slice(PREFIX.length);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** Reads one authored row, and says what is wrong with it. */
function rowProblem(key: string, value: unknown): string | null {
  if (!isAuthoredKey(key)) {
    return `is not keyed "${PREFIX}" followed by a slug`;
  }

  if (!isObject(value)) return "is not an object";

  const extra = Object.keys(value).filter((field) => !FIELDS.includes(field));

  if (extra.length > 0) return `has unknown fields: ${extra.join(", ")}`;

  if (!isText(value.name)) return "name must be a non-empty string";

  if (!isText(value.category)) return "category must be a non-empty string";

  if (value.subcategory !== null && !isText(value.subcategory)) {
    return "subcategory must be a non-empty string or null";
  }

  if (!isText(value.reason)) return "reason must be a non-empty string";

  if (value.replaces !== undefined) {
    if (!Array.isArray(value.replaces) || !value.replaces.every(isText)) {
      return "replaces must be a list of non-empty strings";
    }

    if (value.replaces.length === 0) return "replaces nothing; delete the key instead";
  }

  if (value.conditions !== undefined) {
    const problem = conditionsProblem(value.conditions);

    if (problem !== null) return problem;
  }

  if (value.price !== undefined) {
    const problem = priceProblem(value.price);

    if (problem !== null) return problem;
  }

  return null;
}

/** Checks parsed JSON against `AuthoredTable` and hands back the same value, typed. */
export function validateAuthoredTable(
  value: unknown,
  source: string,
): AuthoredTable {
  if (!isObject(value)) {
    throw new Error(`${source} is not an object`);
  }

  for (const [key, row] of Object.entries(value)) {
    const problem = rowProblem(key, row);

    if (problem !== null) {
      throw new Error(`${source}: "${key}" ${problem}`);
    }
  }

  return value as Readonly<Record<string, AuthoredRow>>;
}
