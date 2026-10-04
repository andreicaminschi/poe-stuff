import { ITEM_PATCH, optional, required, TEXT_LIST, type Params } from "../command-schema.ts";
import type { Stamp } from "../panel-state.ts";
import { patchValues } from "../patch-seeder.ts";
import type { ItemData, ItemPatch, PanelState } from "../types.ts";

export type UpdateItemsCommand = {
  readonly type: "updateItems";
  readonly items: readonly string[];
  readonly add?: ItemPatch;
  readonly remove?: ItemPatch;
};

export const updateItemsParams: Params<UpdateItemsCommand> = { items: required(TEXT_LIST), add: optional(ITEM_PATCH), remove: optional(ITEM_PATCH) };

/** Patches one item's known items and tags. An empty known-item list is dropped. Low, Sonar 1. */
function patchItem(item: ItemData, add: ItemPatch = {}, remove: ItemPatch = {}): ItemData {
  const knownItems = patchValues(item.knownItems ?? [], add.knownItems, remove.knownItems);

  return {
    name: item.name,
    ...(knownItems.length === 0
      ? {}
      : { knownItems }),
    tags: patchValues(item.tags, add.tags, remove.tags),
  };
}

/** Patches every named item, creating the missing ones. Held in memory only, no log entry. Low, Sonar 1. */
export function executeUpdateItems(state: PanelState, command: UpdateItemsCommand, _stamp: Stamp): PanelState {
  const named = new Set(command.items);
  const untouched = state.itemData.filter((item) => !named.has(item.name));
  const patched = command.items.map((name) => patchItem(state.itemData.find((item) => item.name === name) ?? { name, tags: [] }, command.add, command.remove));

  return { ...state, itemData: [...untouched, ...patched] };
}
