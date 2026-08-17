import type { Item, ItemCategory, Items } from "./domain.ts";
import type { RawItemEntry, RawItemGroup, RawItems } from "./raw.ts";

export function transformItems(raw: RawItems): Items {
  const categories = raw.result.map(toCategory);
  const items = categories.flatMap((category) => category.items);

  return {
    totals: {
      categories: categories.length,
      items: items.length,
      unique: items.filter((item) => item.unique).length,
      discriminated: items.filter((item) => item.discriminator !== null).length,
      distinctTypes: new Set(items.map((item) => item.type)).size,
    },
    categories,
  };
}

/** Category order is meaningful (accessory, armour, ... then league oddities). */
function toCategory(group: RawItemGroup): ItemCategory {
  const items = group.entries.map((entry) => toItem(entry, group.id)).sort(byTypeThenName);
  return { id: group.id, label: group.label, count: items.length, items };
}

function toItem(entry: RawItemEntry, category: string): Item {
  return {
    category,
    type: entry.type,
    // Plain bases ship no text at all; their display name is just the base type.
    text: entry.text ?? entry.type,
    name: entry.name ?? null,
    unique: entry.flags?.unique ?? false,
    discriminator: entry.disc ?? null,
  };
}

/** Sorted so the committed output diffs cleanly when GGG reorders entries. */
function byTypeThenName(a: Item, b: Item): number {
  return (
    a.type.localeCompare(b.type) ||
    (a.name ?? "").localeCompare(b.name ?? "") ||
    (a.discriminator ?? "").localeCompare(b.discriminator ?? "")
  );
}
