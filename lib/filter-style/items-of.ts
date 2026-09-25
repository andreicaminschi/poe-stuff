import type { Condition } from "@poe/filter-compile/types";
import { listKey, priceLists } from "./items-of/price-lists.ts";
import { pricesOf } from "./items-of/prices-of.ts";
import type { CatalogRow, CatalogVariant, Item, UniqueListing } from "./types.ts";

const UNIQUE_CATEGORIES = ["unique", "foulborn"];

const isCorrupted = (conditions: readonly Condition[] | undefined): boolean =>
  (conditions ?? []).some((one) => one.condition === "Corrupted" && one.value === true);

const asksForUnique = (conditions: readonly Condition[] | undefined): boolean =>
  (conditions ?? []).some(
    (one) => one.condition === "Rarity" && JSON.stringify(one.value ?? "").includes("Unique"),
  );

const usable = (price: number | undefined, lowConfidence: boolean | undefined): number | undefined =>
  lowConfidence === true || price === undefined || !Number.isFinite(price) ? undefined : price;

function pathOf(row: CatalogRow, stray: boolean): string | null {
  if (stray) return "regular";
  if (row.category === "foulborn") return "foulborn";

  return row.subcategory;
}

function listFor(
  lists: ReadonlyMap<string, readonly UniqueListing[]>,
  row: CatalogRow,
  stray: boolean,
  corrupted: boolean,
): readonly UniqueListing[] | undefined {
  const path = pathOf(row, stray);
  const baseType = row.baseTypes[0];
  if (path === null || baseType === undefined) return undefined;

  const mine = (lists.get(listKey(baseType, path)) ?? []).filter(
    (one) => usable(one.meanPrice, one.lowConfidence) !== undefined && one.corrupted === corrupted,
  );

  return mine.length === 0 ? undefined : mine;
}

function itemOf(
  lists: ReadonlyMap<string, readonly UniqueListing[]>,
  row: CatalogRow,
  variant: CatalogVariant | undefined,
): Item {
  const stray = asksForUnique(variant?.conditions) && !UNIQUE_CATEGORIES.includes(row.category);
  const unique = stray || UNIQUE_CATEGORIES.includes(row.category);
  const corrupted = isCorrupted(row.conditions) || isCorrupted(variant?.conditions);
  const own = variant ?? row;
  const price = usable(own.meanPrice, own.lowConfidence);
  const list = unique ? listFor(lists, row, stray, corrupted) : undefined;
  const outcomes = unique && !corrupted ? listFor(lists, row, stray, true) : undefined;

  return {
    name: variant === undefined ? row.name : `${row.name} (${variant.name})`,
    key: row.key,
    ...(variant === undefined ? {} : { variant: variant.name }),
    category: stray ? "unique" : row.category,
    prices: pricesOf({
      ...(price === undefined ? {} : { price }),
      ...(list === undefined ? {} : { list }),
      ...(outcomes === undefined ? {} : { outcomes }),
      unique,
      corrupted,
    }),
    ...(row.unpriceable === true ? { unpriceable: true } : {}),
  };
}

/**
 * Catalog rows as the items a filter can tell apart on the ground.
 *
 * A variant is its own item, and a row without variants is one. A unique item's worth is the
 * list of forms its base row carries under `uniques`, joined on base type and path, since the
 * authored unique rows carry names and no per-form prices. A `Rarity == Unique` variant on a
 * non-unique row files under `unique`. `lowConfidence` prices are never read.
 */
export function itemsOf(rows: readonly CatalogRow[]): readonly Item[] {
  const lists = priceLists(rows);

  return rows.flatMap((row) => {
    const variants = row.variants ?? [];
    if (variants.length === 0) return [itemOf(lists, row, undefined)];

    return variants.map((variant) => itemOf(lists, row, variant));
  });
}
