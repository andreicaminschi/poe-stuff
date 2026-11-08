import type { Item, ItemPatch, Price } from "@poe/panel-state/types";
import { diffBag } from "./diff-bag.ts";

export type ItemDraft = { readonly tags: readonly string[]; readonly prices: readonly Price[] };

export type ItemUpdate = { readonly add: ItemPatch; readonly remove: ItemPatch; readonly changed: boolean };

const priceKey = (price: Price): string => `${price.provider}:${price.id}`;

export const toItemDraft = (item: Item): ItemDraft => ({ tags: Object.keys(item.tags ?? {}), prices: Object.values(item.prices ?? {}) });

/** Only what changed between the stored item and the draft. */
export function buildItemUpdate(stored: Item, draft: ItemDraft): ItemUpdate {
  const tags = diffBag(stored.tags, draft.tags);
  const storedPrices = Object.values(stored.prices ?? {});
  const storedKeys = storedPrices.map(priceKey);
  const draftKeys = draft.prices.map(priceKey);
  const addedPrices = draft.prices.filter((price) => !storedKeys.includes(priceKey(price)));
  const removedPrices = storedPrices.filter((price) => !draftKeys.includes(priceKey(price)));
  const add: ItemPatch = {
    ...(tags.add.length > 0
      ? { tags: tags.add }
      : {}),
    ...(addedPrices.length > 0
      ? { prices: addedPrices }
      : {}),
  };
  const remove: ItemPatch = {
    ...(tags.remove.length > 0
      ? { tags: tags.remove }
      : {}),
    ...(removedPrices.length > 0
      ? { prices: removedPrices }
      : {}),
  };
  return { add, remove, changed: Object.keys(add).length + Object.keys(remove).length > 0 };
}
