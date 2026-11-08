import type { Item, ItemPatch, PanelState, Price } from "../types.ts";
import { patchBag } from "./patch-bag.ts";

export type UpdateItemCommand = {
  readonly type: "updateItem";
  /** The item key, as `generateItems` writes it. */
  readonly item: string;
  readonly add?: ItemPatch;
  readonly remove?: ItemPatch;
};

const priceKey = (price: Price): string => `${price.provider}:${price.id}`;

/** Returns the prices with `remove` taken out, then `add` put in, or undefined when none are left. */
function patchPrices(prices: Item["prices"], add: readonly Price[] = [], remove: readonly Price[] = []): Item["prices"] {
  const removed = remove.map(priceKey);
  const kept = Object.entries(prices ?? {}).filter(([key]) => !removed.includes(key));
  const patched = { ...Object.fromEntries(kept), ...Object.fromEntries(add.map((price) => [priceKey(price), price])) };

  if (Object.keys(patched).length === 0) return undefined;
  return patched;
}

/**
 * Patches one item's tags and prices. Takes the item keys that are generated, and throws on any
 * other key or a blank price id. An item left empty is removed.
 */
export function executeUpdateItem(state: PanelState, command: UpdateItemCommand, generatedKeys: ReadonlySet<string>): PanelState {
  if (!generatedKeys.has(command.item)) throw new Error(`No item "${command.item}".`);
  if ((command.add?.prices ?? []).some((price) => price.id.trim() === "")) throw new Error("A price needs an id.");
  const current = state.items[command.item] ?? {};
  const tags = patchBag(current.tags, command.add?.tags, command.remove?.tags);
  const prices = patchPrices(current.prices, command.add?.prices, command.remove?.prices);
  const item: Item = {
    ...(tags === undefined
      ? {}
      : { tags }),
    ...(prices === undefined
      ? {}
      : { prices }),
  };
  const others = Object.entries(state.items).filter(([key]) => key !== command.item);

  return {
    ...state,
    items: Object.fromEntries(Object.keys(item).length === 0
      ? others
      : [...others, [command.item, item] as const]),
  };
}
