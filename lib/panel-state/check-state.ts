import { generateItems, listClashes } from "./generate-items.ts";
import { PRICE_PROVIDERS, type PanelState, type SplitSettings } from "./types.ts";

const OPERATORS: readonly unknown[] = ["=", "==", "!", "!=", "<", "<=", ">", ">=", "range"];

/** Tells whether an empty map is allowed here: the roots and the entities (a category, a seeder, an item). */
function allowsEmpty(path: readonly string[]): boolean {
  if (path.length === 1) return true;
  if (path.length === 2) return path[0] === "categories" || path[0] === "items";
  return path.length === 4 && path[0] === "categories" && path[2] === "seeders";
}

/** Tells whether a leaf fits its place: an operator in a seeder condition, a boolean in a split, `true` anywhere else. */
function fitsLeaf(value: unknown, path: readonly string[]): boolean {
  if (path[0] === "categories" && path[4] === "conditions") return OPERATORS.includes(value);
  if (path[0] === "categories" && path[4] === "split") return typeof value === "boolean";
  return value === true;
}

/** Lists the parts a tag map must hold: tags on every seeder entry, conditions and tags on every tag seeder. */
function listMissingParts(state: PanelState): readonly string[] {
  const seederTags = Object.entries(state.seederTags).flatMap(([seeder, entry]) => (entry.tags === undefined
    ? [`seederTags.${seeder} has no tags`]
    : []));
  const tagSeeders = Object.entries(state.tagSeeders).flatMap(([name, entry]) => [
    ...(entry.conditions === undefined
      ? [`tagSeeders.${name} has no conditions`]
      : []),
    ...(entry.tags === undefined
      ? [`tagSeeders.${name} has no tags`]
      : []),
  ]);
  return [...seederTags, ...tagSeeders];
}

/** Lists the seederTags entries whose seeder no category holds. */
function listOrphanSeederTags(state: PanelState): readonly string[] {
  const seeders = new Set(Object.values(state.categories).flatMap((category) => Object.keys(category.seeders ?? {})));
  return Object.keys(state.seederTags).filter((seeder) => !seeders.has(seeder)).map((seeder) => `seederTags "${seeder}" names no seeder`);
}

/** Tells whether a value is one price. */
function isPrice(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const { provider, id } = value as { provider?: unknown; id?: unknown };
  return (PRICE_PROVIDERS as readonly unknown[]).includes(provider) && typeof id === "string" && id !== "";
}

/** Lists the places a value breaks the keyed shape: a list, a stored empty map, or a leaf that does not fit. */
function listShapeProblems(value: unknown, path: readonly string[]): readonly string[] {
  const where = path.join(".");

  if (path[0] === "items" && path[2] === "prices" && path.length === 4) return isPrice(value)
    ? []
    : [`${where} is not a price`];
  if (Array.isArray(value)) return [`${where} is a list, not a map`];
  if (typeof value !== "object" || value === null) return fitsLeaf(value, path)
    ? []
    : [`${where} holds ${JSON.stringify(value)}, which does not fit here`];
  if (Object.keys(value).length === 0 && !allowsEmpty(path)) return [`${where} is empty and should be left out`];
  return Object.entries(value).flatMap(([key, child]) => listShapeProblems(child, [...path, key]));
}

/** Lists every seeder name held by more than one category. */
function listRepeatedSeeders(state: PanelState): readonly string[] {
  const owners = Object.entries(state.categories).flatMap(([category, entry]) => Object.keys(entry.seeders ?? {}).map((seeder) => ({ category, seeder })));

  return [...new Set(owners.map((owner) => owner.seeder))].flatMap((seeder) => {
    const categories = owners.filter((owner) => owner.seeder === seeder).map((owner) => owner.category);
    return categories.length > 1
      ? [`seeder "${seeder}" is in ${categories.join(", ")}`]
      : [];
  });
}

/** Lists item data held for items no seeder outputs, and items two categories output. */
function listItemProblems(state: PanelState, splitDefaults: SplitSettings): readonly string[] {
  const items = generateItems(state, splitDefaults);
  const keys = new Set(items.map((item) => item.key));
  const stale = Object.keys(state.items).filter((key) => !keys.has(key)).map((key) => `item "${key}" is not generated`);
  const clashes = listClashes(items).map((clash) => `item "${clash.key}" is output by ${clash.categories.join(", ")}`);

  return [...stale, ...clashes];
}

/**
 * Lists every way a state breaks its contract: keyed maps only, no stored empty map, one
 * category per seeder name, item data only for generated items, one category per item, and
 * seeder tags only for seeders that exist. Empty when the state holds.
 */
export const checkState = (state: PanelState, splitDefaults: SplitSettings): readonly string[] => [
  ...listRepeatedSeeders(state),
  ...Object.entries(state).flatMap(([key, value]) => listShapeProblems(value, [key])),
  ...listMissingParts(state),
  ...listOrphanSeederTags(state),
  ...listItemProblems(state, splitDefaults),
];
