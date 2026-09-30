import { formatOldPath, type OldCategoryNames, type OldRow } from "./old-taxonomy.ts";
import { resolveBaseTypes } from "./resolve-base-types.ts";
import type { Seeder } from "../types.ts";
import type { SkippedRow } from "../migrate.ts";

/**
 * Builds one seeder per old subcategory, named by its display name, holding every base type
 * its rows resolve to. A row that does not fit, with no subcategory in the table or no
 * `BaseType` condition, is returned as skipped for manual handling. Medium, Sonar 5.
 */
export function buildSubcategorySeeders(
  rows: readonly OldRow[],
  names: OldCategoryNames,
): { readonly seeders: readonly Seeder[]; readonly skipped: readonly SkippedRow[] } {
  const baseTypesByPath = new Map<string, Set<string>>();
  const skipped: SkippedRow[] = [];

  for (const row of rows) {
    const path = formatOldPath(row);
    const baseTypes = resolveBaseTypes(row);

    if (names[path] === undefined) {
      skipped.push({ path, name: row.name, reason: "no subcategory in the old category table" });
    } else if (baseTypes === undefined) {
      skipped.push({ path, name: row.name, reason: "no BaseType condition" });
    } else {
      baseTypesByPath.set(path, new Set([...(baseTypesByPath.get(path) ?? []), ...baseTypes]));
    }
  }

  const seeders = [...baseTypesByPath].map(([path, baseTypes]) => ({
    name: names[path]?.name ?? path,
    conditions: { BaseType: [...baseTypes] },
    tags: [],
  }));

  return { seeders, skipped };
}
