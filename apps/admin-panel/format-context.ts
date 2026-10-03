import type { Category, ConditionValue, ItemData } from "./types.ts";

const MAX_LISTED = 8;

/** A condition the loop knows, with how its values are written. */
export type ConditionFormat = { readonly key: string; readonly values: string };

export type ContextState = {
  readonly categories: readonly Category[];
  readonly itemData: readonly ItemData[];
};

/** Lists names, cut at `MAX_LISTED`. Low, Sonar 1. */
const listNames = (names: readonly string[]): string =>
  names.length > MAX_LISTED
    ? `${names.slice(0, MAX_LISTED).join(", ")} and ${String(names.length - MAX_LISTED)} more`
    : names.join(", ");

/** Reads the BaseType values of a seeder. Low, Sonar 0. */
const readBaseTypes = (values: readonly ConditionValue[] | undefined): readonly string[] =>
  (values ?? []).filter((value): value is string => typeof value === "string");

/** Describes one category. Low, Sonar 1. */
const describeCategory = (category: Category): string =>
  category.seeders.length === 0
    ? `${category.name}: category, empty`
    : `${category.name}: category with seeders ${listNames(category.seeders.map((seeder) => seeder.name))}`;

/** Writes one condition value: a flag, a word or a range. Low, Sonar 1. */
const formatValue = (value: ConditionValue): string =>
  Array.isArray(value)
    ? `${String(value[0])}-${String(value[1])}`
    : String(value);

/** Lists what a seeder or item carries, BaseType left out. Low, Sonar 1. */
function describeDetails(tags: readonly string[], knownItems: readonly string[], conditions: Readonly<Record<string, readonly ConditionValue[]>>): string {
  const parts = [
    tags.length === 0
      ? ""
      : `tags ${tags.join(", ")}`,
    knownItems.length === 0
      ? ""
      : `known items ${listNames(knownItems)}`,
    ...Object.entries(conditions).filter(([key]) => key !== "BaseType").map(([key, values]) => `${key} ${values.map(formatValue).join("/")}`),
  ].filter((part) => part !== "");

  return parts.map((part) => `; ${part}`).join("");
}

/** Describes one name against the state. Low, Sonar 4. */
function describeName(state: ContextState, conditions: readonly ConditionFormat[], name: string): string {
  const category = state.categories.find((at) => at.name === name);
  if (category !== undefined) return describeCategory(category);

  const owner = state.categories.find((at) => at.seeders.some((seeder) => seeder.name === name));
  const seeder = owner?.seeders.find((at) => at.name === name);
  if (owner !== undefined && seeder !== undefined) return `${name}: seeder in ${owner.name}${describeDetails(seeder.tags, seeder.knownItems ?? [], seeder.conditions)}`;

  const holders = state.categories.flatMap((at) => at.seeders.filter((held) => readBaseTypes(held.conditions["BaseType"]).includes(name)).map((held) => held.name));
  const item = state.itemData.find((at) => at.name === name);
  if (holders.length > 0 || item !== undefined) return `${name}: item in ${holders.length === 0
    ? "no seeder"
    : listNames(holders)}${describeDetails(item?.tags ?? [], item?.knownItems ?? [], {})}`;

  const condition = conditions.find((at) => at.key.toLowerCase() === name.toLowerCase());
  if (condition !== undefined) return `${name}: condition, values ${condition.values}`;

  return `${name}: not found`;
}

/**
 * Writes the loop's context: one line per name the query holds, saying what it is in the
 * current state. Training rows and the running loop both use it. Low, Sonar 0.
 *
 * @example
 * formatContext(state, conditions, ["Orb of Alteration", "Junk"]);
 * // → "Orb of Alteration: item in Cheap currency\nJunk: not found"
 */
export const formatContext = (state: ContextState, conditions: readonly ConditionFormat[], names: readonly string[]): string =>
  names.map((name) => describeName(state, conditions, name)).join("\n");
