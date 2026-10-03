import type { Category, Seeder } from "./types.ts";

/** Every seeder in one category, or seeders named one by one. */
export type SeederTargets = { readonly category: string } | { readonly seeders: readonly string[] };

export type TargetSeeder = { readonly category: string; readonly seeder: Seeder };

/** Finds the category holding a seeder name. Names are unique across the panel. Low, Sonar 1. */
function requireNamedSeeder(categories: readonly Category[], name: string): TargetSeeder {
  const category = categories.find((at) => at.seeders.some((seeder) => seeder.name === name));
  const seeder = category?.seeders.find((at) => at.name === name);

  if (category === undefined || seeder === undefined) throw new Error(`No seeder ${name}.`);
  return { category: category.name, seeder };
}

/** Lists the seeders a bulk command targets. Throws when it names something missing. Low, Sonar 2. */
export function resolveSeederTargets(categories: readonly Category[], targets: SeederTargets): readonly TargetSeeder[] {
  if ("seeders" in targets) return targets.seeders.map((name) => requireNamedSeeder(categories, name));

  const category = categories.find((at) => at.name === targets.category);

  if (category === undefined) throw new Error(`No category ${targets.category}.`);
  return category.seeders.map((seeder) => ({ category: category.name, seeder }));
}

/** Names the targets for an approval view. Low, Sonar 1. */
export const describeSeederTargets = (targets: SeederTargets): string =>
  "seeders" in targets
    ? targets.seeders.join(", ")
    : `every seeder in ${targets.category}`;
