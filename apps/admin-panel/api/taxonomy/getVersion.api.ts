import { sourceKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import type {
  AuthoredFile,
  AuthoredItem,
  AuthoredRow,
  CategoriesFile,
  Category,
  Draft,
  GggItem,
  ItemRow,
  ItemsFile,
  Variant,
  VariantsFile,
} from "./types.ts";

const toGggItem = (key: string, row: ItemRow, variants: readonly Variant[]): GggItem => ({
  source: "ggg",
  key,
  name: row.name,
  ...(row.displayName === undefined ? {} : { displayName: row.displayName }),
  classification: { category: row.category, subcategory: row.subcategory },
  ...(row.filterable === undefined ? {} : { filterable: row.filterable }),
  ...(row.tradable === undefined ? {} : { tradable: row.tradable }),
  ...(row.tradedOnExchange === undefined ? {} : { tradedOnExchange: row.tradedOnExchange }),
  ...(row.excluded === true ? { excluded: true } : {}),
  ...(row.quest === true ? { quest: true } : {}),
  ...(row.unpriceable === true ? { unpriceable: true } : {}),
  conditions: row.conditions ?? [],
  ...(row.listing === undefined ? {} : { listing: row.listing }),
  variants,
});

const toAuthoredItem = (key: string, row: AuthoredRow, variants: readonly Variant[]): AuthoredItem => ({
  source: "authored",
  key,
  name: row.name,
  baseType: row.baseType ?? "",
  classification: { category: row.category, subcategory: row.subcategory },
  reason: row.reason,
  replaces: row.replaces ?? [],
  ...(row.excluded === true ? { excluded: true } : {}),
  ...(row.quest === true ? { quest: true } : {}),
  ...(row.unpriceable === true ? { unpriceable: true } : {}),
  conditions: row.conditions ?? [],
  ...(row.listing === undefined ? {} : { listing: row.listing }),
  variants,
});

const mapValues = <T, U>(
  record: Readonly<Record<string, T>>,
  to: (key: string, value: T) => U,
): Record<string, U> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, to(key, value)]));

export async function getVersion(lake: Lake, id: string): Promise<Draft> {
  const [items, categories, authoredSeeded, authoredManual, variantsSeeded, variantsManual] =
    await Promise.all([
      lake.readJson<ItemsFile>(sourceKey(id, "items")),
      lake.readJson<CategoriesFile>(sourceKey(id, "categories")),
      lake.readJson<AuthoredFile>(sourceKey(id, "authored.seeded")),
      lake.readJson<AuthoredFile>(sourceKey(id, "authored.manual")),
      lake.readJson<VariantsFile>(sourceKey(id, "variants.seeded")),
      lake.readJson<VariantsFile>(sourceKey(id, "variants.manual")),
    ]);

  const variants: VariantsFile = { ...variantsSeeded, ...variantsManual };
  const variantsOf = (key: string): readonly Variant[] => variants[key] ?? [];

  return {
    id,
    items: {
      ...mapValues(items, (key, row) => toGggItem(key, row, variantsOf(key))),
      ...mapValues({ ...authoredSeeded, ...authoredManual }, (key, row) =>
        toAuthoredItem(key, row, variantsOf(key)),
      ),
    },
    categories: mapValues(
      categories,
      (path, record): Category => ({
        path,
        ...(record.name === undefined ? {} : { name: record.name }),
        tiering: record.tiering ?? "chaos",
        ...(record.hints === undefined || record.hints.length === 0 ? {} : { hints: record.hints }),
        ...(record.samples === undefined || record.samples.length === 0 ? {} : { samples: record.samples }),
        ...(record.rejects === undefined || record.rejects.length === 0 ? {} : { rejects: record.rejects }),
        ...(record.catchAll === true ? { catchAll: true } : {}),
        ...(record.order === undefined ? {} : { order: record.order }),
        conditions: record.conditions,
      }),
    ),
  };
}
