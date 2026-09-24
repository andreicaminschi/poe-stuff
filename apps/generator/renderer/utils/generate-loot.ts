import type { Loot } from "./loot-pool.ts";
import { weightedPick } from "./weighted-pick.ts";

export const LOOT_COUNT = 10;

const uniform = (list: readonly Loot[]): readonly Loot[] => {
  const one = list[Math.floor(Math.random() * list.length)];
  return one === undefined ? [] : [one];
};

const shuffle = (list: readonly Loot[]): readonly Loot[] => {
  const copy = [...list];
  for (let at = copy.length - 1; at > 0; at -= 1) {
    const other = Math.floor(Math.random() * (at + 1));
    [copy[at], copy[other]] = [copy[other] as Loot, copy[at] as Loot];
  }
  return copy;
};

const weighted = (pool: readonly Loot[], count: number): readonly Loot[] =>
  Array.from({ length: count }, () => weightedPick(pool)).filter((one) => one !== undefined);

/** A drop weighted toward cheap items, the way real loot is mostly junk. */
export const randomLoot = (pool: readonly Loot[]): readonly Loot[] => weighted(pool, LOOT_COUNT);

/** A drop with at least one T0 and two T1, the rest weighted like any drop. */
export function valuableLoot(pool: readonly Loot[]): readonly Loot[] {
  const of = (bucket: string) => pool.filter((one) => one.bucket === bucket);
  const sure = [...uniform(of("T0")), ...uniform(of("T1")), ...uniform(of("T1"))];

  return shuffle([...sure, ...weighted(pool, LOOT_COUNT - sure.length)]);
}
