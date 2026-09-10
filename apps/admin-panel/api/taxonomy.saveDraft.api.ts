import { registryKey, sourceKey } from "./keys.ts";
import type { Lake } from "@poe/lake/types";
import { toVersionList } from "./taxonomy.getVersions.api.ts";
import type {
  AuthoredFile,
  AuthoredItem,
  AuthoredRow,
  CategoriesFile,
  Category,
  CategoryRecord,
  DraftChanges,
  GggItem,
  Item,
  ItemRow,
  ItemsFile,
  Variant,
  VariantsFile,
} from "./taxonomy.types.ts";

type Registry = Parameters<typeof toVersionList>[0];

const toItemRow = (item: GggItem): ItemRow => ({
  name: item.name,
  category: item.classification.category,
  subcategory: item.classification.subcategory,
  ...(item.filterable === undefined ? {} : { filterable: item.filterable }),
  ...(item.tradable === undefined ? {} : { tradable: item.tradable }),
  ...(item.tradedOnExchange === undefined ? {} : { tradedOnExchange: item.tradedOnExchange }),
  ...(item.excluded === true ? { excluded: true } : {}),
  ...(item.conditions.length === 0 ? {} : { conditions: item.conditions }),
  ...(item.listing === undefined ? {} : { listing: item.listing }),
});

const toAuthoredRow = (item: AuthoredItem): AuthoredRow => ({
  name: item.name,
  category: item.classification.category,
  subcategory: item.classification.subcategory,
  ...(item.replaces.length === 0 ? {} : { replaces: item.replaces }),
  reason: item.reason,
  ...(item.excluded === true ? { excluded: true } : {}),
  ...(item.conditions.length === 0 ? {} : { conditions: item.conditions }),
  ...(item.listing === undefined ? {} : { listing: item.listing }),
});

const toCategoryRecord = (category: Category): CategoryRecord => ({
  conditions: category.conditions,
  ...(category.name === undefined ? {} : { name: category.name }),
  ...(category.tiering === "chaos" ? {} : { tiering: category.tiering }),
});

function patch<T, U>(
  file: Readonly<Record<string, U>>,
  changes: Readonly<Record<string, T | null>>,
  to: (value: T, key: string) => U,
): Record<string, U> {
  const next: Record<string, U> = { ...file };

  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete next[key];
    else next[key] = to(value, key);
  }

  return next;
}

const sameVariants = (a: readonly Variant[] | undefined, b: readonly Variant[]): boolean =>
  JSON.stringify(a ?? []) === JSON.stringify(b);

function nextManualVariants(
  manual: VariantsFile,
  seeded: VariantsFile,
  items: readonly Item[],
): Record<string, readonly Variant[]> {
  const next: Record<string, readonly Variant[]> = { ...manual };

  for (const { key, variants } of items) {
    if (sameVariants(manual[key] ?? seeded[key], variants)) continue;
    if (variants.length === 0 || sameVariants(seeded[key], variants)) delete next[key];
    else next[key] = variants;
  }

  return next;
}

async function assertEditable(lake: Lake, id: string): Promise<void> {
  const list = toVersionList(await lake.readJson<Registry>(registryKey()), undefined);
  const version = list.versions.find((candidate) => candidate.id === id);

  if (version?.editable !== true) {
    throw new Error(`${id} cannot be edited. Only the newest draft can.`);
  }
}

async function saveItems(lake: Lake, id: string, items: readonly Item[]): Promise<void> {
  const [itemsFile, authoredFile, variantsManual, variantsSeeded] = await Promise.all([
    lake.readJson<ItemsFile>(sourceKey(id, "items")),
    lake.readJson<AuthoredFile>(sourceKey(id, "authored.manual")),
    lake.readJson<VariantsFile>(sourceKey(id, "variants.manual")),
    lake.readJson<VariantsFile>(sourceKey(id, "variants.seeded")),
  ]);
  const ggg = items.filter((item): item is GggItem => item.source === "ggg");
  const authored = items.filter((item): item is AuthoredItem => item.source === "authored");
  const unknown = ggg.find((item) => itemsFile[item.key] === undefined);

  if (unknown !== undefined) {
    throw new Error(`"${unknown.key}" is not an item. Author a row instead.`);
  }

  if (ggg.length > 0) {
    await lake.writeJsonAtomic(sourceKey(id, "items"), {
      ...itemsFile,
      ...Object.fromEntries(ggg.map((item) => [item.key, toItemRow(item)])),
    });
  }

  if (authored.length > 0) {
    await lake.writeJsonAtomic(sourceKey(id, "authored.manual"), {
      ...authoredFile,
      ...Object.fromEntries(authored.map((item) => [item.key, toAuthoredRow(item)])),
    });
  }

  await lake.writeJsonAtomic(
    sourceKey(id, "variants.manual"),
    nextManualVariants(variantsManual, variantsSeeded, items),
  );
}

export async function saveDraft(lake: Lake, id: string, changes: DraftChanges): Promise<void> {
  await assertEditable(lake, id);

  if (changes.items !== undefined) {
    await saveItems(lake, id, Object.values(changes.items));
  }

  if (changes.categories !== undefined) {
    const key = sourceKey(id, "categories");
    await lake.writeJsonAtomic(
      key,
      patch(await lake.readJson<CategoriesFile>(key), changes.categories, toCategoryRecord),
    );
  }
}
