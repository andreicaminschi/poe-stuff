export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export const unknownFields = (value: Record<string, unknown>, known: readonly string[]): readonly string[] =>
  Object.keys(value).filter((key) => !known.includes(key));

/** The first of these fields that is present and not a boolean, as a problem. */
export function optionalBooleanProblem(value: Record<string, unknown>, fields: readonly string[]): string | null {
  const wrong = fields.find((field) => value[field] !== undefined && typeof value[field] !== "boolean");
  return wrong === undefined ? null : `${wrong} must be a boolean when it is present`;
}
