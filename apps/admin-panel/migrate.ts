import { buildClusterSeeders } from "./migrate/build-cluster-seeders.ts";
import { buildSubcategorySeeders } from "./migrate/build-subcategory-seeders.ts";
import { buildUniqueSeeders } from "./migrate/build-unique-seeders.ts";
import {
  formatOldPath,
  listOldRows,
  readBaseType,
  type OldCategories,
  type OldCategoryNames,
  type OldRow,
  type OldTaxonomy,
} from "./migrate/old-taxonomy.ts";
import type { Category } from "./types.ts";

export type SkippedRow = { readonly path: string; readonly name: string; readonly reason: string };

export type MigratedTaxonomy = {
  readonly categories: readonly Category[];
  readonly skipped: readonly SkippedRow[];
};

type CategoryRows = {
  readonly key: string;
  readonly rows: readonly OldRow[];
  readonly clusterRows: readonly OldRow[];
};

const FOULBORN_BY_UNIQUE_CATEGORY: Readonly<Record<string, boolean>> = { unique: false, foulborn: true };

const CLUSTER_PATH = "jewels/cluster";

/**
 * Builds one new category from an old top-level category's rows: per-base unique seeders for
 * the two unique categories, else a seeder per subcategory plus the cluster seeders.
 * Undefined when no seeder came out. Medium, Sonar 3.
 */
function buildCategory(
  group: CategoryRows,
  names: OldCategoryNames,
): { readonly category: Category | undefined; readonly skipped: readonly SkippedRow[] } {
  const foulborn = FOULBORN_BY_UNIQUE_CATEGORY[group.key];
  const name = names[group.key]?.name ?? group.key;

  const subcategories = foulborn === undefined
    ? buildSubcategorySeeders(group.rows, names)
    : { seeders: buildUniqueSeeders(group.rows, foulborn), skipped: [] };
  const seeders = [...subcategories.seeders, ...buildClusterSeeders(group.clusterRows)];

  return { category: seeders.length === 0 ? undefined : { name, seeders }, skipped: subcategories.skipped };
}

/**
 * Migrates the old taxonomy into new categories and seeders, and returns every row it left
 * out with the reason. Quest rows go to "Quest" whatever else they are. Excluded and
 * unfilterable rows are dropped. High, Sonar 6 and dense.
 *
 * @example
 * migrateTaxonomy(
 *   { items: { a: { name: "Ruby Ring", category: "bases", subcategory: "ring",
 *       conditions: [{ condition: "BaseType", from: "name" }] } }, authored: {} },
 *   { categories: { bases: { name: "Bases" }, "bases/ring": { name: "Rings" } } },
 * );
 * // → { categories: [
 * //       { name: "Bases", seeders: [{ name: "Rings", conditions: { BaseType: ["Ruby Ring"] }, tags: [] }] },
 * //       { name: "Quest", seeders: [{ name: "Quest Items", conditions: { BaseType: [] }, tags: [] }] }],
 * //     skipped: [] }
 */
export function migrateTaxonomy(taxonomy: OldTaxonomy, old: OldCategories): MigratedTaxonomy {
  const rows = listOldRows(taxonomy);
  const questRows = rows.filter((row) => row.quest === true);
  const liveRows = rows.filter((row) => row.quest !== true && row.excluded !== true && row.filterable !== false);
  const topLevelKeys = Object.keys(old.categories).filter((key) => !key.includes("/"));

  const orphans = liveRows
    .filter((row) => !topLevelKeys.includes(row.category))
    .map((row) => ({ path: formatOldPath(row), name: row.name, reason: "no category in the old category table" }));

  const built = topLevelKeys.map((key) => {
    const categoryRows = liveRows.filter((row) => row.category === key);
    const isCluster = (row: OldRow) => formatOldPath(row) === CLUSTER_PATH;

    return buildCategory(
      { key, rows: categoryRows.filter((row) => !isCluster(row)), clusterRows: categoryRows.filter(isCluster) },
      old.categories,
    );
  });

  const quest: Category = {
    name: "Quest",
    seeders: [{ name: "Quest Items", conditions: { BaseType: [...new Set(questRows.map(readBaseType))] }, tags: [] }],
  };

  return {
    categories: [...built.flatMap(({ category }) => (category === undefined ? [] : [category])), quest],
    skipped: [...orphans, ...built.flatMap(({ skipped }) => skipped)],
  };
}
