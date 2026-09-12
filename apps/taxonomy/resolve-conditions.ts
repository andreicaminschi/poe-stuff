import { resolveForms, resolvePath } from "@poe/filter-compile/resolve-row";
import type { FromSource, RemovedCondition, ResolvedCondition } from "@poe/filter-compile/types";
import type { AuthoredEntry, AuthoredRow, Version } from "./types.ts";

export type { Level, RemovedCondition, ResolvedCondition } from "@poe/filter-compile/types";

export type Resolution = {
  readonly key: string;
  readonly variant?: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly removed: readonly RemovedCondition[];
  readonly problems: readonly string[];
};

/** The row, and what a `from` reads off it: a plain row's base type is its name. */
function rowOf(
  version: Version,
  key: string,
): { readonly row: AuthoredEntry | AuthoredRow; readonly source: FromSource } {
  const item = version.items[key];
  if (item !== undefined) return { row: item, source: { name: item.name, baseTypes: [item.name] } };

  const authored = version.authored[key];
  if (authored !== undefined) {
    return { row: authored, source: { name: authored.name, baseTypes: [authored.baseType] } };
  }

  throw new Error(`"${key}" is not an item or an authored row in this version`);
}

export function resolveRow(version: Version, key: string): readonly Resolution[] {
  const { row, source } = rowOf(version, key);

  return resolveForms(
    version.categories,
    { ...source, category: row.category, subcategory: row.subcategory, conditions: row.conditions ?? [] },
    version.variants[key],
  ).map((form) => ({ key, ...form }));
}

export function resolveCategory(version: Version, path: string): Resolution {
  const { applied, removed } = resolvePath(version.categories, path);

  return { key: path, conditions: applied, removed, problems: [] };
}

function drawableRows(version: Version): readonly (readonly [string, string])[] {
  return [
    ...Object.entries(version.items)
      .filter(([, row]) => row.excluded !== true && row.filterable !== false)
      .map(([key, row]) => [key, row.category] as const),
    ...Object.entries(version.authored)
      .filter(([, row]) => row.excluded !== true)
      .map(([key, row]) => [key, row.category] as const),
  ];
}

export function resolutionProblems(version: Version): readonly Resolution[] {
  return drawableRows(version)
    .flatMap(([key]) => resolveRow(version, key))
    .filter((resolution) => resolution.problems.length > 0);
}

export function unauthoredCategories(version: Version): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();

  for (const [, category] of drawableRows(version)) {
    if (version.categories[category] === undefined) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return Object.fromEntries(counts);
}
