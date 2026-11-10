import { formatCondition, generateItems, type ItemCondition } from "@poe/panel-state/generate-items";
import { listItemTags, type TagSeederMatch } from "@poe/panel-state/list-item-tags";
import type { PanelState } from "@poe/panel-state/types";
import { SPLIT_DEFAULTS } from "@poe/panel-state/split-defaults";

/** One generated item as the list shows it. Seeders in one category may share an item. */
export type ItemRow = {
  readonly key: string;
  readonly name: string;
  /** `Category / BaseType`. */
  readonly head: string;
  /** `[every other condition]`, or empty. */
  readonly rest: string;
  readonly category: string;
  readonly seeders: readonly string[];
  /** Every name its seeders hold. */
  readonly names: readonly string[];
  readonly conditions: readonly ItemCondition[];
  readonly seederTags: readonly string[];
  /** Every tag seeder the item matches, with its tags. */
  readonly tagSeeders: readonly TagSeederMatch[];
  /** The tags those tag seeders give, once each. */
  readonly tagSeederTags: readonly string[];
};

/** Splits an item into `Category / BaseType` and `[every other condition]`. */
function nameItem(category: string, conditions: readonly ItemCondition[]): { head: string; rest: string } {
  const baseType = conditions.find((entry) => entry.condition === "BaseType");
  const others = conditions.filter((entry) => entry !== baseType).map(formatCondition);
  const base = baseType === undefined
    ? "(any base)"
    : Object.keys(baseType.values).join(" | ");

  return {
    head: `${category} / ${base}`,
    rest: others.length === 0
      ? ""
      : `[${others.join(", ")}]`,
  };
}

/** Lists every generated item once, sorted by name, with the tags it shows. */
export function listItemRows(state: PanelState): readonly ItemRow[] {
  const byKey = Map.groupBy(generateItems(state, SPLIT_DEFAULTS), (item) => item.key);

  return [...byKey].map(([key, items]) => {
    const first = items[0];
    const category = first?.category ?? "";
    const seeders = items.map((item) => item.seeder);
    const stored = seeders.map((seeder) => state.categories[category]?.seeders?.[seeder]);
    const tags = items.map((item) => listItemTags(state, item));
    const seederTags = new Set(tags.flatMap((entry) => entry.seederTags));
    const tagSeeders = tags[0]?.tagSeeders ?? [];
    const names = new Set(stored.flatMap((seeder) => Object.keys(seeder?.names ?? {})));
    const { head, rest } = nameItem(category, first?.conditions ?? []);
    return {
      key,
      name: rest === ""
        ? head
        : `${head} ${rest}`,
      head,
      rest,
      category,
      seeders,
      names: [...names],
      conditions: first?.conditions ?? [],
      seederTags: [...seederTags],
      tagSeeders,
      tagSeederTags: [...new Set(tagSeeders.flatMap((match) => match.tags))],
    };
  }).toSorted((left, right) => left.name.localeCompare(right.name));
}
