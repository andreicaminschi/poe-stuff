import type { AuthoredEntry, TaxonomyTable } from "./types.ts";
import { collect, throwFirst, type RowProblem } from "./validate.ts";
import { conditionsProblem } from "./validate-conditions.ts";

const FIELDS = [
  "name",
  "displayName",
  "category",
  "subcategory",
  "filterable",
  "tradable",
  "tradedOnExchange",
  "excluded",
  "conditions",
  "listing",
];

const OPTIONAL_FLAGS = ["filterable", "tradable", "tradedOnExchange", "excluded"] as const;

const PRICE_KEYS: Readonly<Record<string, "number" | "boolean" | "string">> = {
  name: "string",
  passives: "string",
  gemLevel: "number",
  gemQuality: "number",
  gemIsCorrupted: "boolean",
  linkCount: "number",
  itemLevel: "number",
  mapTier: "number",
  tier: "number",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCategory = (value: unknown): boolean =>
  typeof value === "string" && value.length > 0;

const isSubcategory = (value: unknown): boolean =>
  value === null || isCategory(value);

const unknownFields = (value: Record<string, unknown>, known: readonly string[]) =>
  Object.keys(value).filter((key) => !known.includes(key));

export function listingProblem(value: unknown): string | null {
  if (!isObject(value)) return "listing is not an object";

  const keys = Object.keys(value);

  if (keys.length === 0) return "listing matches nothing";

  for (const key of keys) {
    const expected = PRICE_KEYS[key];

    if (expected === undefined) return `listing has unknown field: ${key}`;
    if (typeof value[key] !== expected) return `listing.${key} must be a ${expected}`;
  }

  return null;
}

function entryProblem(value: unknown): string | null {
  if (!isObject(value)) {
    return "is not an object";
  }

  const extra = unknownFields(value, FIELDS);

  if (extra.length > 0) {
    return `has unknown fields: ${extra.join(", ")}`;
  }

  if (!isCategory(value.name)) {
    return "name must be a non-empty string";
  }

  if (value.displayName !== undefined && !isCategory(value.displayName)) {
    return "displayName must be a non-empty string when it is present";
  }

  if (!isCategory(value.category)) {
    return "category must be a non-empty string";
  }

  if (!isSubcategory(value.subcategory)) {
    return "subcategory must be a non-empty string or null";
  }

  for (const flag of OPTIONAL_FLAGS) {
    if (value[flag] !== undefined && typeof value[flag] !== "boolean") {
      return `${flag} must be a boolean when it is present`;
    }
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

export const collectTaxonomyTable = (
  value: unknown,
  source: string,
): readonly RowProblem[] => collect(value, source, (_key, entry) => entryProblem(entry));

export function validateTaxonomyTable(
  value: unknown,
  source: string,
): TaxonomyTable {
  throwFirst(source, collectTaxonomyTable(value, source));

  return value as Readonly<Record<string, AuthoredEntry>>;
}
