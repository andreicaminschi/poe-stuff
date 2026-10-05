import { SHORTHANDS } from "./condition-values.ts";
import type { Category, ConditionValue, ItemData, Seeder } from "./types.ts";

const MAX_LISTED = 8;

/** A condition the loop knows, with how its values are written. */
export type ConditionFormat = { readonly key: string; readonly description: string };

export type ContextState = {
  readonly categories: readonly Category[];
  readonly itemData: readonly ItemData[];
};

/** The values of a list the request mentions, and how many the list holds. */
export type Mentioned = { readonly mentioned: readonly string[]; readonly total: number };

/** What one name is in the current state, field by field. */
export type ContextEntry = { readonly name: string; readonly kind: string } & Readonly<Record<string, string | readonly string[] | Mentioned>>;

/** Reads the BaseType values of a seeder. Low, Sonar 0. */
const readBaseTypes = (values: readonly ConditionValue[] | undefined): readonly string[] =>
  (values ?? []).filter((value): value is string => typeof value === "string");

/** Writes one condition value: a flag, a word or a range. Low, Sonar 1. */
const formatValue = (value: ConditionValue): string =>
  Array.isArray(value)
    ? `${String(value[0])}-${String(value[1])}`
    : String(value);

/** True when `word` stands in `query` as a whole word, case aside. Low, Sonar 1. */
function isMentioned(query: string, word: string): boolean {
  const text = query.toLowerCase();
  const needle = word.toLowerCase();
  const isEdge = (at: number) => at < 0 || at >= text.length || !/[\p{L}\p{N}]/u.test(text[at] ?? "");

  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) {
    if (needle !== "" && isEdge(at - 1) && isEdge(at + needle.length)) return true;
  }
  return false;
}

/** The query with every name's words blanked, so a tag never matches inside a name. Low, Sonar 1. */
const blankNames = (query: string, names: readonly string[]): string =>
  names.reduce((text, name) => (name === ""
    ? text
    : text.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), (found) => " ".repeat(found.length))), query);

/** Keeps the values the request mentions, and counts all of them. Low, Sonar 0. */
const keepMentioned = (query: string, values: readonly string[], words: (value: string) => readonly string[] = (value) => [value]): Mentioned =>
  ({ mentioned: values.filter((value) => words(value).some((word) => isMentioned(query, word))), total: values.length });

/** A condition key and every shorthand that means it. Low, Sonar 0. */
const conditionWords = (key: string): readonly string[] =>
  [key, ...Object.entries(SHORTHANDS).filter(([, name]) => name === key).map(([word]) => word)];

/** Every condition but BaseType, the ones the request names, as `Key value/value`. Low, Sonar 1. */
function keepConditions(query: string, conditions: Readonly<Record<string, readonly ConditionValue[]>>): Mentioned {
  const entries = Object.entries(conditions).filter(([key]) => key !== "BaseType");
  const named = entries.filter(([key]) => conditionWords(key).some((word) => isMentioned(query, word)));

  return { mentioned: named.map(([key, values]) => `${key} ${values.map(formatValue).join("/")}`), total: entries.length };
}

/** `n of N` for each value in `values` that `held` says a seeder carries. Low, Sonar 1. */
const countEach = (label: string, values: readonly string[], seeders: readonly Seeder[], held: (seeder: Seeder, value: string) => boolean): Readonly<Record<string, string>> =>
  Object.fromEntries(values.map((value) => [`seeders with ${label} ${value}`, `${String(seeders.filter((seeder) => held(seeder, value)).length)} of ${String(seeders.length)}`]));

/**
 * For a bulk request: how many of the category's seeders already carry each tag, known item
 * or condition the request mentions. A value no seeder carries gets no line. Low, Sonar 2.
 */
function countOnSeeders(category: Category, query: string, tagQuery: string): Readonly<Record<string, string>> {
  const seeders = category.seeders;
  const tags = keepMentioned(tagQuery, [...new Set(seeders.flatMap((seeder) => seeder.tags))]).mentioned;
  const knownItems = keepMentioned(query, [...new Set(seeders.flatMap((seeder) => seeder.knownItems ?? []))]).mentioned;
  const conditionKeys = [...new Set(seeders.flatMap((seeder) => Object.keys(seeder.conditions)))]
    .filter((key) => key !== "BaseType" && conditionWords(key).some((word) => isMentioned(query, word)));

  return {
    ...countEach("tag", tags, seeders, (seeder, tag) => seeder.tags.includes(tag)),
    ...countEach("known item", knownItems, seeders, (seeder, item) => (seeder.knownItems ?? []).includes(item)),
    ...countEach("condition", conditionKeys, seeders, (seeder, key) => seeder.conditions[key] !== undefined),
  };
}

/**
 * Describes one name against the state, its long lists cut to what the request mentions.
 * Tags match against `tagQuery`, the query with names blanked. Low, Sonar 4.
 */
function describeName(state: ContextState, conditions: readonly ConditionFormat[], query: string, tagQuery: string, name: string): ContextEntry {
  const category = state.categories.find((at) => at.name === name);
  if (category !== undefined) return { name, kind: "category", seeders: keepMentioned(query, category.seeders.map((seeder) => seeder.name)), ...countOnSeeders(category, query, tagQuery) };

  const owner = state.categories.find((at) => at.seeders.some((seeder) => seeder.name === name));
  const seeder = owner?.seeders.find((at) => at.name === name);
  if (owner !== undefined && seeder !== undefined) {
    return {
      name,
      kind: "seeder",
      categories: [owner.name],
      tags: keepMentioned(tagQuery, seeder.tags),
      "known items": keepMentioned(query, seeder.knownItems ?? []),
      conditions: keepConditions(query, seeder.conditions),
    };
  }

  const holders = state.categories.flatMap((at) => at.seeders.filter((held) => readBaseTypes(held.conditions["BaseType"]).includes(name)).map((held) => ({ category: at.name, seeder: held.name })));
  const item = state.itemData.find((at) => at.name === name);
  if (holders.length > 0 || item !== undefined) {
    return {
      name,
      kind: "item",
      categories: [...new Set(holders.map((at) => at.category))],
      seeders: holders.map((at) => at.seeder),
      tags: keepMentioned(tagQuery, item?.tags ?? []),
      "known items": keepMentioned(query, item?.knownItems ?? []),
    };
  }

  const condition = conditions.find((at) => at.key.toLowerCase() === name.toLowerCase());
  if (condition !== undefined) return { name, kind: "condition", description: condition.description };

  return { name, kind: "not found" };
}

/** Every name the query holds, described against the state. Low, Sonar 0. */
export function describeNames(state: ContextState, conditions: readonly ConditionFormat[], query: string, names: readonly string[]): readonly ContextEntry[] {
  const tagQuery = blankNames(query, names);
  return names.map((name) => describeName(state, conditions, query, tagQuery, name));
}

/** A list cut at `MAX_LISTED`, or `none`. Low, Sonar 2. */
function writeList(values: readonly string[]): string {
  if (values.length === 0) return "none";
  if (values.length > MAX_LISTED) return `${values.slice(0, MAX_LISTED).join(", ")} and ${String(values.length - MAX_LISTED)} more`;
  return values.join(", ");
}

/** `chase (of 40)`, `none mentioned (of 40)`, or `none` for an empty list. Low, Sonar 2. */
function writeMentioned(value: Mentioned): string {
  if (value.total === 0) return "none";
  if (value.mentioned.length === 0) return `none mentioned (of ${String(value.total)})`;
  return `${writeList(value.mentioned)} (of ${String(value.total)})`;
}

/** One field's value as text. Low, Sonar 1. */
function writeValue(value: string | readonly string[] | Mentioned): string {
  if (typeof value === "string") return value;
  if ("mentioned" in value) return writeMentioned(value);
  return writeList(value);
}

/** One entry as `key: value` lines. Low, Sonar 0. */
const writeLines = (entry: ContextEntry): string =>
  Object.entries(entry).map(([key, value]) => `${key}: ${writeValue(value)}`).join("\n");

/**
 * The encoder adapters' context: one block of `key: value` lines per name, blank line
 * between. Long lists keep only what `query` mentions, with a count. Low, Sonar 0.
 *
 * @example
 * formatContext(state, conditions, "tag Chaos Orb chase", ["Chaos Orb"]);
 * // → "name: Chaos Orb\nkind: item\n…\ntags: chase (of 40)\nknown items: none mentioned (of 12)"
 */
export const formatContext = (state: ContextState, conditions: readonly ConditionFormat[], query: string, names: readonly string[]): string =>
  describeNames(state, conditions, query, names).map(writeLines).join("\n\n");

/** The filler's context: the same entries as one JSON array. Low, Sonar 0. */
export const formatContextJson = (state: ContextState, conditions: readonly ConditionFormat[], query: string, names: readonly string[]): string =>
  JSON.stringify(describeNames(state, conditions, query, names));
