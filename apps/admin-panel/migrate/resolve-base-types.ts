import { readBaseType, type OldRow } from "./old-taxonomy.ts";

/**
 * Resolves a row's `BaseType` condition into plain strings, so a seeder can hold them without
 * the old `from` templates. Undefined when the row has no `BaseType` condition it can resolve,
 * so the caller can report the row for manual handling.
 *
 * Medium, Sonar 4.
 */
export function resolveBaseTypes(row: OldRow): readonly string[] | undefined {
  const condition = row.conditions?.find((c) => c.condition === "BaseType");

  if (condition === undefined) return undefined;
  if (condition.from === "name") return [row.name];
  if (condition.from === "baseTypes") return [readBaseType(row)];
  if (condition.value !== undefined) return [condition.value].flat() as string[];

  return undefined;
}
