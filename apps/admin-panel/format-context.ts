import type { Category, ConditionValue, ItemData } from "./types.ts";

const MAX_LISTED = 8;

/** A condition the loop knows, with how its values are written. */
export type ConditionFormat = { readonly key: string; readonly description: string };

export type ContextState = {
  readonly categories: readonly Category[];
  readonly itemData: readonly ItemData[];
};

/** Lists names, cut at `MAX_LISTED`, or `none`. Low, Sonar 2. */
function listNames(names: readonly string[]): string {
  if (names.length === 0) return "none";
  if (names.length > MAX_LISTED) return `${names.slice(0, MAX_LISTED).join(", ")} and ${String(names.length - MAX_LISTED)} more`;
  return names.join(", ");
}

/** Reads the BaseType values of a seeder. Low, Sonar 0. */
const readBaseTypes = (values: readonly ConditionValue[] | undefined): readonly string[] =>
  (values ?? []).filter((value): value is string => typeof value === "string");

/** Describes one category. Low, Sonar 0. */
const describeCategory = (category: Category): string =>
  `${category.name}: category, seeders ${listNames(category.seeders.map((seeder) => seeder.name))}`;

/** Writes one condition value: a flag, a word or a range. Low, Sonar 1. */
const formatValue = (value: ConditionValue): string =>
  Array.isArray(value)
    ? `${String(value[0])}-${String(value[1])}`
    : String(value);

/** Every condition but BaseType, as `Key value/value`. Low, Sonar 1. */
const listConditions = (conditions: Readonly<Record<string, readonly ConditionValue[]>>): readonly string[] =>
  Object.entries(conditions).filter(([key]) => key !== "BaseType").map(([key, values]) => `${key} ${values.map(formatValue).join("/")}`);

/** Describes one name against the state. Low, Sonar 4. */
function describeName(state: ContextState, conditions: readonly ConditionFormat[], name: string): string {
  const category = state.categories.find((at) => at.name === name);
  if (category !== undefined) return describeCategory(category);

  const owner = state.categories.find((at) => at.seeders.some((seeder) => seeder.name === name));
  const seeder = owner?.seeders.find((at) => at.name === name);
  if (owner !== undefined && seeder !== undefined) {
    return `${name}: seeder, categories ${owner.name}, tags ${listNames(seeder.tags)}, known items ${listNames(seeder.knownItems ?? [])}, conditions ${listNames(listConditions(seeder.conditions))}`;
  }

  const holders = state.categories.flatMap((at) => at.seeders.filter((held) => readBaseTypes(held.conditions["BaseType"]).includes(name)).map((held) => ({ category: at.name, seeder: held.name })));
  const item = state.itemData.find((at) => at.name === name);
  if (holders.length > 0 || item !== undefined) {
    const categories = [...new Set(holders.map((at) => at.category))];
    return `${name}: item, categories ${listNames(categories)}, seeders ${listNames(holders.map((at) => at.seeder))}, tags ${listNames(item?.tags ?? [])}, known items ${listNames(item?.knownItems ?? [])}`;
  }

  const condition = conditions.find((at) => at.key.toLowerCase() === name.toLowerCase());
  if (condition !== undefined) return `${name}: ${condition.description}`;

  return `${name}: not found`;
}

/**
 * Writes the loop's context: one line per name the query holds, saying what it is in the
 * current state. Training rows and the running loop both use it. Low, Sonar 0.
 *
 * @example
 * formatContext(state, conditions, ["Orb of Alteration", "Junk"]);
 * // → "Orb of Alteration: item, categories Currency, seeders Cheap currency, tags none, known items none\nJunk: not found"
 */
export const formatContext = (state: ContextState, conditions: readonly ConditionFormat[], names: readonly string[]): string =>
  names.map((name) => describeName(state, conditions, name)).join("\n");
