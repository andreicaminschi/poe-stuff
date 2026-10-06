/** Tells whether a value is a keyed map that a diff can walk into. */
export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
