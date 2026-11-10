import type { Item, ItemPatch, Price } from "@poe/panel-state/types";

export type ItemDraft = { readonly prices: readonly Price[] };

export type ItemUpdate = { readonly add: ItemPatch; readonly remove: ItemPatch; readonly changed: boolean };

const priceKey = (price: Price): string => `${price.provider}:${price.id}`;

export const toItemDraft = (item: Item): ItemDraft => ({ prices: Object.values(item.prices ?? {}) });

/** Only what changed between the stored item and the draft. */
export function buildItemUpdate(stored: Item, draft: ItemDraft): ItemUpdate {
  const storedPrices = Object.values(stored.prices ?? {});
  const storedKeys = storedPrices.map(priceKey);
  const draftKeys = draft.prices.map(priceKey);
  const addedPrices = draft.prices.filter((price) => !storedKeys.includes(priceKey(price)));
  const removedPrices = storedPrices.filter((price) => !draftKeys.includes(priceKey(price)));
  const add: ItemPatch = addedPrices.length > 0
    ? { prices: addedPrices }
    : {};
  const remove: ItemPatch = removedPrices.length > 0
    ? { prices: removedPrices }
    : {};
  return { add, remove, changed: addedPrices.length + removedPrices.length > 0 };
}
