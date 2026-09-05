import type { CategoryTable, TieringMethod } from "./types.ts";

/** What `from` may name. The catalog reads exactly these two off a row. */
const FIELDS = ["name", "baseTypes"];

const CONDITION_FIELDS = ["condition", "operator", "value", "from"];

/** The condition a record must not author beside `BaseType`. */
const CLASS = "Class";
const BASE_TYPE = "BaseType";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): boolean =>
  typeof value === "string" && value.length > 0;

const isLiteral = (value: unknown): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  (Array.isArray(value) && value.every((entry) => typeof entry === "string"));

const unknownFields = (value: Record<string, unknown>, known: readonly string[]) =>
  Object.keys(value).filter((key) => !known.includes(key));

/**
 * Reads one condition, and says what is wrong with it.
 *
 * Returns the reason rather than throwing, the same way the item checker does, so the caller
 * stays the one place that knows which record it was reading.
 */
function conditionProblem(value: unknown): string | null {
  if (!isObject(value)) return "is not an object";

  const extra = unknownFields(value, CONDITION_FIELDS);

  if (extra.length > 0) return `has unknown fields: ${extra.join(", ")}`;

  if (!isText(value.condition)) {
    return "condition must be a non-empty string";
  }

  if (value.operator !== undefined && !isText(value.operator)) {
    return "operator must be a non-empty string when it is present";
  }

  const hasValue = "value" in value;
  const hasFrom = value.from !== undefined;

  if (hasValue && hasFrom) {
    return `${String(value.condition)} has both value and from, which are the two ways to say the same thing`;
  }

  if (!hasValue && !hasFrom) {
    return `${String(value.condition)} has neither value nor from`;
  }

  if (hasFrom && !FIELDS.includes(String(value.from))) {
    return `${String(value.condition)} reads from "${String(value.from)}", which is not a row field. Known: ${FIELDS.join(", ")}`;
  }

  if (hasValue && !isLiteral(value.value)) {
    return `${String(value.condition)} has a value that is not a string, number, boolean, list of strings or null`;
  }

  return null;
}

/**
 * Reads a whole condition list, and says what is wrong with it.
 *
 * The list is where two conditions can disagree with each other, which a single condition
 * cannot: the same name twice, or `Class` beside the `BaseType` that makes it redundant.
 */
export function conditionsProblem(value: unknown): string | null {
  if (!Array.isArray(value)) return "conditions is not a list";

  const seen = new Set<string>();

  for (const condition of value) {
    const problem = conditionProblem(condition);

    if (problem !== null) return problem;

    const entry = condition as Record<string, unknown>;
    const key = `${String(entry.condition)} ${String(entry.operator ?? "==")}`;

    if (seen.has(key)) {
      return `${key} is authored twice in one list, and the second wins silently`;
    }

    seen.add(key);
  }

  // A removal does not count as authoring one. `map/blighted` writes Class and removes the
  // BaseType its category authored, in one record, and that is the flag-block shape rather
  // than the mistake below.
  const named = new Set(
    value
      .map((condition) => condition as Record<string, unknown>)
      .filter((condition) => condition.value !== null)
      .map((condition) => String(condition.condition)),
  );

  if (named.has(CLASS) && named.has(BASE_TYPE)) {
    return `authors both ${CLASS} and ${BASE_TYPE}. BaseType == is exact, so the class does nothing — drop it, or remove BaseType with a null value`;
  }

  return null;
}

/** Every value `tiering` may take. A category that writes anything else is refused. */
const TIERING: readonly TieringMethod[] = ["chaos", "stack-size"];

const PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/;

/**
 * Checks parsed JSON against `CategoryTable` and hands it back, typed.
 *
 * A key is a category path — `map`, or `map/blighted`. One level of nesting and no more,
 * because the taxonomy files a row under a category and a subcategory and nothing deeper.
 */
export function validateCategoryTable(
  value: unknown,
  source: string,
): CategoryTable {
  if (!isObject(value)) {
    throw new Error(`${source} is not an object`);
  }

  for (const [path, record] of Object.entries(value)) {
    if (!PATH.test(path)) {
      throw new Error(
        `${source}: "${path}" is not a category path — expected "category" or "category/subcategory", slugged`,
      );
    }

    if (!isObject(record)) {
      throw new Error(`${source}: "${path}" is not an object`);
    }

    const extra = unknownFields(record, ["conditions", "name", "tiering"]);

    if (extra.length > 0) {
      throw new Error(`${source}: "${path}" has unknown fields: ${extra.join(", ")}`);
    }

    if (record.name !== undefined && !isText(record.name)) {
      throw new Error(`${source}: "${path}" name must be a non-empty string when it is present`);
    }

    if (record.tiering !== undefined && !TIERING.includes(record.tiering as TieringMethod)) {
      throw new Error(
        `${source}: "${path}" tiering must be one of ${TIERING.join(", ")} when it is present`,
      );
    }

    const problem = conditionsProblem(record.conditions);

    if (problem !== null) {
      throw new Error(`${source}: "${path}" ${problem}`);
    }
  }

  return value as CategoryTable;
}
