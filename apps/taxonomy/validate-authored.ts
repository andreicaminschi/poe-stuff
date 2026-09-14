import type { AuthoredRow, AuthoredTable } from "./types.ts";
import { collect, throwFirst, type RowProblem } from "./validate.ts";
import { conditionsProblem } from "./validate-conditions.ts";
import { listingProblem } from "./validate-table.ts";

const FIELDS = [
  "name",
  "baseType",
  "category",
  "subcategory",
  "replaces",
  "reason",
  "excluded",
  "quest",
  "conditions",
  "listing",
];

const slug = (field: string): string =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PREFIX = "authored/";

const isAuthoredKey = (key: string): boolean =>
  key.startsWith(PREFIX) &&
  key.length > PREFIX.length &&
  slug(key.slice(PREFIX.length)) === key.slice(PREFIX.length);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function rowProblem(key: string, value: unknown): string | null {
  if (!isAuthoredKey(key)) {
    return `is not keyed "${PREFIX}" followed by a slug`;
  }

  if (!isObject(value)) return "is not an object";

  const extra = Object.keys(value).filter((field) => !FIELDS.includes(field));

  if (extra.length > 0) return `has unknown fields: ${extra.join(", ")}`;

  if (!isText(value.name)) return "name must be a non-empty string";

  if (!isText(value.baseType)) return "baseType must be a non-empty string";

  if (!isText(value.category)) return "category must be a non-empty string";

  if (value.subcategory !== null && !isText(value.subcategory)) {
    return "subcategory must be a non-empty string or null";
  }

  if (!isText(value.reason)) return "reason must be a non-empty string";

  if (value.excluded !== undefined && typeof value.excluded !== "boolean") {
    return "excluded must be a boolean when it is present";
  }

  if (value.quest !== undefined && typeof value.quest !== "boolean") {
    return "quest must be a boolean when it is present";
  }

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

  if (value.listing !== undefined) {
    const problem = listingProblem(value.listing);

    if (problem !== null) return problem;
  }

  return null;
}

export const collectAuthoredTable = (
  value: unknown,
  source: string,
): readonly RowProblem[] => collect(value, source, rowProblem);

export function validateAuthoredTable(
  value: unknown,
  source: string,
): AuthoredTable {
  throwFirst(source, collectAuthoredTable(value, source));

  return value as Readonly<Record<string, AuthoredRow>>;
}
