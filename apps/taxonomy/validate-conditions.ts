import { CONDITIONS, CONDITIONS_BY_LOWER } from "@poe/filter-eval/filter-ast";
import type { CategoryTable, Hint, TieringMethod } from "./types.ts";
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

const HINTS: readonly Hint[] = ["check", "gamble"];

function hintsProblem(path: string, hints: unknown): string | null {
  if (hints === undefined) return null;
  if (path.includes("/")) return "hints belong on a top-level category — a subcategory takes its parent's";
  if (!Array.isArray(hints)) return `hints must be a list of ${HINTS.join(", ")}`;

  const unknown = hints.filter((hint) => !HINTS.includes(hint as Hint));
  if (unknown.length > 0) return `hints must be ${HINTS.join(" or ")}, not ${unknown.join(", ")}`;

  if (new Set(hints).size !== hints.length) return "hints lists the same hint twice";

  return null;
}

const SAMPLE_FROM = ["name", "baseTypes", "conditions"];

function sampleValueProblem(name: string, value: unknown): string | null {
  const entry = CONDITIONS[name as keyof typeof CONDITIONS];

  switch (entry.kind) {
    case "boolean":
      return typeof value === "boolean" ? null : `${name} takes true or false, not ${JSON.stringify(value)}`;
    case "numeric":
      return typeof value === "number" ? null : `${name} takes a number, not ${JSON.stringify(value)}`;
    case "ordered":
      return entry.order.includes(value as never) ? null : `${name} takes one of ${entry.order.join(", ")}, not ${JSON.stringify(value)}`;
    case "enums":
      return entry.values.includes(value as never) ? null : `${name} takes one of ${entry.values.join(", ")}, not ${JSON.stringify(value)}`;
    default:
      return typeof value === "string" ? null : `${name} takes text, not ${JSON.stringify(value)}`;
  }
}

function samplePropertyProblem(name: string, property: unknown): string | null {
  if (CONDITIONS_BY_LOWER.get(name.toLowerCase()) !== name) {
    return `samples names "${name}", which is not a filter condition`;
  }

  if (!isObject(property)) return `samples ${name} is not an object`;

  const extra = unknownFields(property, ["values", "from"]);
  if (extra.length > 0) return `samples ${name} has unknown fields: ${extra.join(", ")}`;

  if (property.from !== undefined) {
    if (property.values !== undefined) return `samples ${name} has both values and from`;
    return SAMPLE_FROM.includes(String(property.from))
      ? null
      : `samples ${name} reads from "${String(property.from)}". Known: ${SAMPLE_FROM.join(", ")}`;
  }

  if (!Array.isArray(property.values) || property.values.length === 0) {
    return `samples ${name} needs a non-empty values list or a from`;
  }

  for (const value of property.values) {
    const problem = sampleValueProblem(name, value);
    if (problem !== null) return `samples ${problem}`;
  }

  return null;
}

function samplesProblem(samples: unknown): string | null {
  if (samples === undefined) return null;
  if (!Array.isArray(samples)) return "samples must be a list of sample sets";

  for (const set of samples) {
    if (!isObject(set) || Object.keys(set).length === 0) return "each sample set must be a non-empty object";

    for (const [name, property] of Object.entries(set)) {
      const problem = samplePropertyProblem(name, property);
      if (problem !== null) return problem;
    }
  }

  return null;
}

const NAME = String.raw`[^/\s](?:[^/]*[^/\s])?`;
const PATH = new RegExp(`^${NAME}(?:/${NAME})?$`);

function categoryProblem(path: string, record: unknown): string | null {
  if (!PATH.test(path)) {
    return 'is not a category path — expected "category" or "category/subcategory", with no spaces at either end of a name';
  }

  if (!isObject(record)) return "is not an object";

  const extra = unknownFields(record, ["conditions", "name", "tiering", "hints", "samples"]);

  if (extra.length > 0) return `has unknown fields: ${extra.join(", ")}`;

  if (record.name !== undefined && !isText(record.name)) {
    return "name must be a non-empty string when it is present";
  }

  if (record.tiering !== undefined && !TIERING.includes(record.tiering as TieringMethod)) {
    return `tiering must be one of ${TIERING.join(", ")} when it is present`;
  }

  const hints = hintsProblem(path, record.hints);
  if (hints !== null) return hints;

  const samples = samplesProblem(record.samples);
  if (samples !== null) return samples;

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
