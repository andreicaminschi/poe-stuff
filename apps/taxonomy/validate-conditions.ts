import type { CategoryTable, TieringMethod } from "./types.ts";
import { collect, throwFirst, type RowProblem } from "./validate.ts";

const FIELDS = ["name", "baseTypes"];

const CONDITION_FIELDS = ["condition", "operator", "value", "from"];

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

const TIERING: readonly TieringMethod[] = ["chaos", "stack-size"];

const PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/;

function categoryProblem(path: string, record: unknown): string | null {
  if (!PATH.test(path)) {
    return 'is not a category path — expected "category" or "category/subcategory", slugged';
  }

  if (!isObject(record)) return "is not an object";

  const extra = unknownFields(record, ["conditions", "name", "tiering"]);

  if (extra.length > 0) return `has unknown fields: ${extra.join(", ")}`;

  if (record.name !== undefined && !isText(record.name)) {
    return "name must be a non-empty string when it is present";
  }

  if (record.tiering !== undefined && !TIERING.includes(record.tiering as TieringMethod)) {
    return `tiering must be one of ${TIERING.join(", ")} when it is present`;
  }

  return conditionsProblem(record.conditions);
}

export const collectCategoryTable = (
  value: unknown,
  source: string,
): readonly RowProblem[] => collect(value, source, categoryProblem);

export function validateCategoryTable(
  value: unknown,
  source: string,
): CategoryTable {
  throwFirst(source, collectCategoryTable(value, source));

  return value as CategoryTable;
}
