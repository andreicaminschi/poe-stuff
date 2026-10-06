import type { Item, ItemPatch, PanelState } from "../types.ts";
import { resolveItem } from "./find-seeder.ts";
import { patchBag } from "./patch-bag.ts";

export type UpdateItemsCommand = {
  readonly type: "updateItems";
  readonly items: readonly string[];
  readonly add?: ItemPatch;
  readonly remove?: ItemPatch;
};

/** Patches one item's tags and known items, dropping a bag left empty. */
function patchItem(item: Item, add: ItemPatch = {}, remove: ItemPatch = {}): Item {
  const tags = patchBag(item.tags, add.tags, remove.tags);
  const knownItems = patchBag(item.knownItems, add.knownItems, remove.knownItems);

  return {
    ...(tags === undefined
      ? {}
      : { tags }),
    ...(knownItems === undefined
      ? {}
      : { knownItems }),
  };
}

/** Patches every named item. A misspelt name resolves when one item is close enough; throws on a name that matches none. An item left empty stays, so its edits read as edits. */
export function executeUpdateItems(state: PanelState, command: UpdateItemsCommand): PanelState {
  if (command.items.length === 0) throw new Error("No items named.");
  const items = command.items.map((name) => resolveItem(state, name));
  const patched = items.map((name) => [name, patchItem(state.items[name] ?? {}, command.add, command.remove)] as const);

  return { ...state, items: { ...state.items, ...Object.fromEntries(patched) } };
}
