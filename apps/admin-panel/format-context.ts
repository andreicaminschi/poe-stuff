import type { Category, ConditionValue, ItemData } from "./types.ts";

const MAX_LISTED = 8;

/** A condition the loop knows, with how its values are written. */
export type ConditionFormat = { readonly key: string; readonly description: string };

export type ContextState = {
  readonly categories: readonly Category[];
  readonly itemData: readonly ItemData[];
};

/** What one name is in the current state, field by field. */
export type ContextEntry = { readonly name: string; readonly kind: string } & Readonly<Record<string, string | readonly string[]>>;

/** Reads the BaseType values of a seeder. Low, Sonar 0. */
const readBaseTypes = (values: readonly ConditionValue[] | undefined): readonly string[] =>
  (values ?? []).filter((value): value is string => typeof value === "string");

/** Writes one condition value: a flag, a word or a range. Low, Sonar 1. */
const formatValue = (value: ConditionValue): string =>
  Array.isArray(value)
    ? `${String(value[0])}-${String(value[1])}`
    : String(value);

/** Every condition but BaseType, as `Key value/value`. Low, Sonar 1. */
const listConditions = (conditions: Readonly<Record<string, readonly ConditionValue[]>>): readonly string[] =>
  Object.entries(conditions).filter(([key]) => key !== "BaseType").map(([key, values]) => `${key} ${values.map(formatValue).join("/")}`);

/** Describes one name against the state. Low, Sonar 4. */
function describeName(state: ContextState, conditions: readonly ConditionFormat[], name: string): ContextEntry {
  const category = state.categories.find((at) => at.name === name);
  if (category !== undefined) return { name, kind: "category", seeders: category.seeders.map((seeder) => seeder.name) };

  const owner = state.categories.find((at) => at.seeders.some((seeder) => seeder.name === name));
  const seeder = owner?.seeders.find((at) => at.name === name);
  if (owner !== undefined && seeder !== undefined) {
    return { name, kind: "seeder", categories: [owner.name], tags: seeder.tags, "known items": seeder.knownItems ?? [], conditions: listConditions(seeder.conditions) };
  }

  const holders = state.categories.flatMap((at) => at.seeders.filter((held) => readBaseTypes(held.conditions["BaseType"]).includes(name)).map((held) => ({ category: at.name, seeder: held.name })));
  const item = state.itemData.find((at) => at.name === name);
  if (holders.length > 0 || item !== undefined) {
    return { name, kind: "item", categories: [...new Set(holders.map((at) => at.category))], seeders: holders.map((at) => at.seeder), tags: item?.tags ?? [], "known items": item?.knownItems ?? [] };
  }

  const condition = conditions.find((at) => at.key.toLowerCase() === name.toLowerCase());
  if (condition !== undefined) return { name, kind: "condition", description: condition.description };

  return { name, kind: "not found" };
}

/** Every name the query holds, described against the state. Low, Sonar 0. */
export const describeNames = (state: ContextState, conditions: readonly ConditionFormat[], names: readonly string[]): readonly ContextEntry[] =>
  names.map((name) => describeName(state, conditions, name));

/** A list cut at `MAX_LISTED`, or `none`. Low, Sonar 2. */
function writeList(values: readonly string[]): string {
  if (values.length === 0) return "none";
  if (values.length > MAX_LISTED) return `${values.slice(0, MAX_LISTED).join(", ")} and ${String(values.length - MAX_LISTED)} more`;
  return values.join(", ");
}

/** One entry as `key: value` lines. Low, Sonar 1. */
const writeLines = (entry: ContextEntry): string =>
  Object.entries(entry).map(([key, value]) => `${key}: ${typeof value === "string"
    ? value
    : writeList(value)}`).join("\n");

/**
 * The encoder adapters' context: one block of `key: value` lines per name, blank line
 * between. Low, Sonar 0.
 *
 * @example
 * formatContext(state, conditions, ["Junk"]);
 * // → "name: Junk\nkind: not found"
 */
export const formatContext = (state: ContextState, conditions: readonly ConditionFormat[], names: readonly string[]): string =>
  describeNames(state, conditions, names).map(writeLines).join("\n\n");

/** The filler's context: the same entries as one JSON array. Low, Sonar 0. */
export const formatContextJson = (state: ContextState, conditions: readonly ConditionFormat[], names: readonly string[]): string =>
  JSON.stringify(describeNames(state, conditions, names));
