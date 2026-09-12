import type { RowProblem } from "./validate.ts";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every seed row's name. A `BaseType` the client accepts is one of these. */
export function seedNames(items: unknown): ReadonlySet<string> {
  if (!isObject(items)) return new Set();

  return new Set(
    Object.values(items).flatMap((row) =>
      isObject(row) && typeof row.name === "string" ? [row.name] : [],
    ),
  );
}

/**
 * Whether each authored row's `baseType` is one a filter can write.
 *
 * A valid one names a seed row and is not in the rejects list. Shape is not checked here —
 * `collectAuthoredTable` owns that, so a row with no `baseType` is skipped rather than
 * reported twice.
 */
export function collectBaseTypes(
  authored: unknown,
  seeds: ReadonlySet<string>,
  rejected: ReadonlySet<string>,
): readonly RowProblem[] {
  if (!isObject(authored)) return [];

  return Object.entries(authored).flatMap(([key, row]) => {
    if (!isObject(row) || typeof row.baseType !== "string" || row.baseType === "") return [];

    if (rejected.has(row.baseType)) {
      return [{ key, problem: `baseType "${row.baseType}" is one the client rejects` }];
    }

    if (!seeds.has(row.baseType)) {
      return [{ key, problem: `baseType "${row.baseType}" is not the name of any seed row` }];
    }

    return [];
  });
}
