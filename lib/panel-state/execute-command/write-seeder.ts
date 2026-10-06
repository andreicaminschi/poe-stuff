import type { PanelState, Seeder } from "../types.ts";

/** One seeder written into a category, or taken out of it when `value` is undefined. */
export type SeederWrite = { readonly category: string; readonly seeder: string; readonly value: Seeder | undefined };

/** Rebuilds one category's seeders after its writes: untouched seeders keep their place, written ones go last, in the order of their last write. */
function rebuildSeeders(current: Readonly<Record<string, Seeder>>, writes: readonly SeederWrite[]): readonly (readonly [string, Seeder])[] {
  const lastWrite = new Map(writes.map((write, index) => [write.seeder, index]));
  const kept = Object.entries(current).filter(([name]) => !lastWrite.has(name));
  const written = writes.flatMap((write, index) => (lastWrite.get(write.seeder) === index && write.value !== undefined
    ? [[write.seeder, write.value] as const]
    : []));

  return [...kept, ...written];
}

/**
 * Returns the state with many seeder writes applied, rebuilding each touched category once. A
 * bulk command over a large category costs one copy of it, not one per seeder. A category left
 * with no seeders keeps no empty `seeders` map.
 *
 * @example
 * writeSeeders(state, [{ category: "Bases", seeder: "Rings", value: undefined }, { category: "Jewels", seeder: "Rings", value: rings }]);
 * // → Rings gone from Bases, last in Jewels
 */
export function writeSeeders(state: PanelState, writes: readonly SeederWrite[]): PanelState {
  const categories = [...new Set(writes.map((write) => write.category))];
  const rebuilt = categories.map((category) => {
    const seeders = rebuildSeeders(state.categories[category]?.seeders ?? {}, writes.filter((write) => write.category === category));
    return [category, seeders.length === 0
      ? {}
      : { seeders: Object.fromEntries(seeders) }] as const;
  });

  return { ...state, categories: { ...state.categories, ...Object.fromEntries(rebuilt) } };
}

/** Returns the state with one seeder written into a category, or taken out of it when `seeder` is undefined. */
export const writeSeeder = (state: PanelState, category: string, name: string, seeder: Seeder | undefined): PanelState =>
  writeSeeders(state, [{ category, seeder: name, value: seeder }]);
