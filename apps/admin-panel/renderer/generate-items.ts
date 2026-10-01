import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import type { Category, ConditionValue, Seeder } from "../types.ts";
import { sortSeeders } from "./sort-seeders.ts";

export type SeededItem = {
  readonly category: string;
  readonly seeder: string;
  readonly name: string | undefined;
  readonly baseType: string;
  readonly tags: readonly string[];
  readonly search: string;
};

type Pick = readonly [string, ConditionValue];

/** Lists a seeder's condition keys the game does not know. Low, Sonar 0. */
export const listUnknownKeys = (seeder: Seeder): readonly string[] =>
  Object.keys(seeder.conditions).filter((key) => !(key in CONDITIONS));

/**
 * Formats the tag one condition value earns: `key` for true, none for false, `key:a-b` for a
 * range and `key:value` for text. Low, Sonar 3.
 *
 * @example
 * formatTag("ItemLevel", [84, 84]); // → "itemlevel:84"
 */
function formatTag(key: string, value: ConditionValue): string | undefined {
  const lower = key.toLowerCase();

  if (value === true) return lower;
  if (value === false) return undefined;
  if (typeof value === "object") return value[0] === value[1]
    ? `${lower}:${value[0]}`
    : `${lower}:${value[0]}-${value[1]}`;

  return `${lower}:${value.toLowerCase()}`;
}

/** Lists every combination of a seeder's condition values. Low, Sonar 0. */
const combine = (conditions: Seeder["conditions"]): readonly (readonly Pick[])[] =>
  Object.entries(conditions).reduce<readonly (readonly Pick[])[]>(
    (combos, [key, values]) => combos.flatMap((combo) => values.map((value) => [...combo, [key, value] as const])),
    [[]],
  );

/** Reads the base type a combination stands for, else its class, else the seeder's name. Low, Sonar 1. */
function readBaseType(combo: readonly Pick[], seeder: Seeder): string {
  const text = (key: string) => combo.find(([at, value]) => at === key && typeof value === "string")?.[1];

  return String(text("BaseType") ?? text("Class") ?? seeder.name);
}

/**
 * Generates one category's items: the cartesian product of each seeder's conditions, tagged
 * from the values, the seeder's tags and the category name. A seeder with known items makes
 * one named item per known item for each combination. A seeder with an unknown condition key
 * generates nothing. Medium, Sonar 2.
 *
 * @example
 * generateItems({ name: "Rings", seeders: [{ name: "Ruby", tags: ["ring"],
 *   conditions: { BaseType: ["Ruby Ring"], FracturedItem: [true, false] } }] });
 * // → [{ baseType: "Ruby Ring", tags: ["basetype:ruby ring", "fractureditem", "ring", "rings"], … },
 * //    { baseType: "Ruby Ring", tags: ["basetype:ruby ring", "ring", "rings"], … }]
 */
export function generateItems(category: Category): readonly SeededItem[] {
  return sortSeeders(category.seeders).flatMap((seeder) => {
    if (listUnknownKeys(seeder).length > 0) return [];

    const names = seeder.knownItems === undefined || seeder.knownItems.length === 0
      ? [undefined]
      : seeder.knownItems;

    return combine(seeder.conditions).flatMap((combo) => {
      const own = combo.flatMap(([key, value]) => formatTag(key, value) ?? []);
      const tags = [...new Set([...own, ...seeder.tags, category.name.toLowerCase()])];
      const baseType = readBaseType(combo, seeder);

      return names.map((name) => ({
        category: category.name,
        seeder: seeder.name,
        name,
        baseType,
        tags,
        search: `${name ?? ""} ${baseType} ${tags.join(" ")}`.toLowerCase(),
      }));
    });
  });
}
