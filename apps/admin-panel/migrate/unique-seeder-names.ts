import type { Category } from "../types.ts";

export type SeederRename = {
  readonly category: string;
  readonly from: string;
  readonly to: string;
};

/** Names the new name for a seeder whose name repeats: "Foulborn …" in Foulborn Uniques, else "<Category> …". Low, Sonar 1. */
function renameSeeder(category: string, name: string): string {
  if (category === "Foulborn Uniques") return `Foulborn ${name}`;
  return `${category} ${name}`;
}

/**
 * Lists the renames that make every seeder name unique across categories. A name held once is
 * left alone. A name held in several categories is renamed everywhere except `Uniques`, which
 * keeps the plain name. Low, Sonar 2.
 *
 * @example
 * listUniqueRenames(categories);
 * // → [{ category: "Foulborn Uniques", from: "Cloth Belt Uniques", to: "Foulborn Cloth Belt Uniques" }, …]
 */
export function listUniqueRenames(categories: readonly Category[]): readonly SeederRename[] {
  const holders = categories.flatMap((category) => category.seeders.map((seeder) => ({ category: category.name, name: seeder.name })));
  const repeated = new Set(holders.filter((at, index) => holders.findIndex((other) => other.name === at.name) !== index).map((at) => at.name));

  return holders
    .filter((at) => repeated.has(at.name) && at.category !== "Uniques")
    .map((at) => ({ category: at.category, from: at.name, to: renameSeeder(at.category, at.name) }));
}
