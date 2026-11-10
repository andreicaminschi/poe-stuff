import type { SeederTags } from "@poe/panel-state/types";
import type { Change, Patch } from "../session/patch.ts";
import { listSeederTags, stripCategory, stripItem, type LegacyCategory, type LegacyItem } from "./convert-state.ts";

/** A patch as stored before tag seeders: categories and items only. */
export type LegacyPatch = {
  readonly categories: Readonly<Record<string, Change<LegacyCategory>>>;
  readonly items: Readonly<Record<string, Change<LegacyItem>>>;
};

const isSame = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/** Keeps the changes whose sides still differ. */
const keepChanged = <T>(changes: readonly (readonly [string, Change<T>])[]): Readonly<Record<string, Change<T>>> =>
  Object.fromEntries(changes.filter(([, change]) => !isSame(change.before, change.after)));

/** Collects the seeder tags held on one side of every category change. */
const collectSide = (patch: LegacyPatch, side: "before" | "after"): ReadonlyMap<string, SeederTags> =>
  new Map(Object.values(patch.categories).flatMap((change) => {
    const category = change[side];
    return category === null
      ? []
      : listSeederTags(category);
  }));

/** Lists a seederTags change for every seeder whose tags differ between the two sides. */
function diffSeederTags(patch: LegacyPatch): Readonly<Record<string, Change<SeederTags>>> {
  const before = collectSide(patch, "before");
  const after = collectSide(patch, "after");
  const seeders = [...new Set([...before.keys(), ...after.keys()])];

  return keepChanged(seeders.map((seeder) => [seeder, { before: before.get(seeder) ?? null, after: after.get(seeder) ?? null }] as const));
}

/**
 * Rewrites one stored patch for tag seeders: seeder tags leave the category changes and become
 * `seederTags` changes, item tags are dropped, and a change left with equal sides goes. A seeder
 * moved between two categories in one patch keeps its tags and gets no change.
 *
 * @example
 * convertPatch({ categories: { Bases: { before: { seeders: { Rings: {} } }, after: { seeders: { Rings: { tags: { chase: true } } } } } }, items: {} });
 * // → { categories: {}, items: {}, seederTags: { Rings: { before: null, after: { tags: { chase: true } } } }, tagSeeders: {} }
 */
export function convertPatch(patch: LegacyPatch): Patch {
  const categories = Object.entries(patch.categories).map(([name, change]) => [name, {
    before: change.before === null
      ? null
      : stripCategory(change.before),
    after: change.after === null
      ? null
      : stripCategory(change.after),
  }] as const);
  const items = Object.entries(patch.items).map(([key, change]) => [key, {
    before: change.before === null
      ? null
      : stripItem(change.before),
    after: change.after === null
      ? null
      : stripItem(change.after),
  }] as const);

  return {
    categories: keepChanged(categories),
    items: keepChanged(items),
    seederTags: diffSeederTags(patch),
    tagSeeders: {},
  };
}
