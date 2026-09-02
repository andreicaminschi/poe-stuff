import type { AuthoredEntry, TaxonomyTable } from "./types.ts";
import { conditionsProblem } from "./validate-conditions.ts";

const FIELDS = [
  "name",
  "category",
  "subcategory",
  "filterable",
  "tradable",
  "tradedOnExchange",
  "conditions",
  "variants",
  "original",
];

/** The fields that are absent unless a person overrode them, and are booleans when present. */
const OPTIONAL_FLAGS = ["filterable", "tradable", "tradedOnExchange"] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCategory = (value: unknown): boolean =>
  typeof value === "string" && value.length > 0;

const isSubcategory = (value: unknown): boolean =>
  value === null || isCategory(value);

const unknownFields = (value: Record<string, unknown>, known: readonly string[]) =>
  Object.keys(value).filter((key) => !known.includes(key));

/**
 * Reads one row, and says what is wrong with it.
 *
 * Returns the reason rather than throwing, so the caller stays the one place that knows
 * which key it was reading and can name it in the message.
 */
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

  if (!isCategory(value.category)) {
    return "category must be a non-empty string";
  }

  if (!isSubcategory(value.subcategory)) {
    return "subcategory must be a non-empty string or null";
  }

  // Absent is the ordinary case for all three. Only a written value says otherwise.
  for (const flag of OPTIONAL_FLAGS) {
    if (value[flag] !== undefined && typeof value[flag] !== "boolean") {
      return `${flag} must be a boolean when it is present`;
    }
  }

  if (value.conditions !== undefined) {
    const problem = conditionsProblem(value.conditions);

    if (problem !== null) return problem;
  }

  if (value.variants !== undefined) {
    if (!Array.isArray(value.variants)) return "variants is not a list";

    const names = new Set<string>();

    for (const variant of value.variants) {
      if (!isObject(variant)) return "a variant is not an object";

      const extra = unknownFields(variant, ["name", "conditions"]);

      if (extra.length > 0) {
        return `a variant has unknown fields: ${extra.join(", ")}`;
      }

      if (!isCategory(variant.name)) {
        return "a variant name must be a non-empty string";
      }

      const name = variant.name as string;

      if (names.has(name)) {
        return `variant "${name}" is authored twice`;
      }

      names.add(name);

      const problem = conditionsProblem(variant.conditions);

      if (problem !== null) return `variant "${name}" ${problem}`;
    }
  }

  const original = value.original;

  if (!isObject(original)) {
    return "original is not an object";
  }

  const originalExtra = unknownFields(original, ["category", "subcategory"]);

  if (originalExtra.length > 0) {
    return `original has unknown fields: ${originalExtra.join(", ")}`;
  }

  if (!isCategory(original.category)) {
    return "original.category must be a non-empty string";
  }

  if (!isSubcategory(original.subcategory)) {
    return "original.subcategory must be a non-empty string or null";
  }

  return null;
}

/**
 * Checks parsed JSON against `TaxonomyTable` and hands back the same value, typed.
 *
 * **The JSON file is the source of truth, so this is where its shape is enforced.** Nothing
 * else can: `tsc` never reads a `.json` file, and the table is edited by hand and by `jq`,
 * so a typo would otherwise reach the publisher and land in the lake — where a version is
 * immutable and the mistake is permanent.
 *
 * It fails on the first bad row and names it. Listing every problem would read better in a
 * report, but this runs for a CLI that is about to publish a version somebody has to go and
 * fix by hand, and the first name is enough to start.
 *
 * `source` is the file the value came from and appears in the message, because the point is
 * to say *which* version is wrong.
 */
export function validateTaxonomyTable(
  value: unknown,
  source: string,
): TaxonomyTable {
  if (!isObject(value)) {
    throw new Error(`${source} is not an object`);
  }

  for (const [name, entry] of Object.entries(value)) {
    const problem = entryProblem(entry);

    if (problem !== null) {
      throw new Error(`${source}: "${name}" ${problem}`);
    }
  }

  return value as Readonly<Record<string, AuthoredEntry>>;
}
