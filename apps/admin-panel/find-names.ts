import type { Category, ItemData } from "./types.ts";

type Panel = { readonly categories: readonly Category[]; readonly itemData: readonly ItemData[] };

/** Every name the panel knows: categories, seeders, base types, known items, item data. Low, Sonar 0. */
export const listKnownNames = (panel: Panel): readonly string[] => [...new Set([
  ...panel.categories.map((category) => category.name),
  ...panel.categories.flatMap((category) => category.seeders.flatMap((seeder) => [
    seeder.name,
    ...(seeder.conditions["BaseType"] ?? []).filter((value): value is string => typeof value === "string"),
    ...(seeder.knownItems ?? []),
  ])),
  ...panel.itemData.map((item) => item.name),
])];

const isWordEdge = (text: string, at: number): boolean => at < 0 || at >= text.length || !/[\p{L}\p{N}]/u.test(text[at] ?? "");

/** Finds every whole-word place a name occurs, ignoring case. Low, Sonar 1. */
function findSpans(text: string, name: string): readonly { readonly start: number; readonly end: number; readonly name: string }[] {
  const lower = text.toLowerCase();
  const needle = name.toLowerCase();
  const spans: { start: number; end: number; name: string }[] = [];

  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, at + 1)) {
    if (isWordEdge(text, at - 1) && isWordEdge(text, at + needle.length)) spans.push({ start: at, end: at + needle.length, name });
  }
  return spans;
}

/**
 * Finds the known names an instruction mentions, in the order they appear. A longer name
 * wins over a shorter one inside it, so "Heavy Belt Uniques" is not also "Heavy Belt".
 * Low, Sonar 2.
 *
 * @example
 * findNames(["Heavy Belt", "Heavy Belt Uniques", "Rarity"], "add Rarity Unique to Heavy Belt Uniques");
 * // → ["Rarity", "Heavy Belt Uniques"]
 */
export function findNames(knownNames: readonly string[], text: string): readonly string[] {
  const spans = knownNames.flatMap((name) => findSpans(text, name)).sort((left, right) => (right.end - right.start) - (left.end - left.start));
  const taken: { start: number; end: number; name: string }[] = [];

  for (const span of spans) {
    if (!taken.some((at) => span.start < at.end && at.start < span.end)) taken.push(span);
  }
  return [...new Set(taken.sort((left, right) => left.start - right.start).map((at) => at.name))];
}
