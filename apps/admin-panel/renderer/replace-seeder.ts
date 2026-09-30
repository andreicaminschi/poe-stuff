import type { Category, Seeder } from "../types.ts";
import { readSeederCategory, readSeederName } from "./seeder-key.ts";

/**
 * Returns the categories with one seeder swapped for another, or removed when there is no
 * replacement. The seeder keeps its place in its category. Low, Sonar 2.
 */
export function replaceSeeder(categories: readonly Category[], key: string, next: Seeder | undefined): readonly Category[] {
  const categoryName = readSeederCategory(key);
  const seederName = readSeederName(key);

  return categories.map((category) => {
    if (category.name !== categoryName) return category;

    const seeders = category.seeders.flatMap((seeder) => {
      if (seeder.name !== seederName) return [seeder];
      return next === undefined
        ? []
        : [next];
    });

    return { ...category, seeders };
  });
}
