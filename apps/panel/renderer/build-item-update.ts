import type { Item, ItemPatch } from "@poe/panel-state/types";
import { diffBag } from "./diff-bag.ts";

export type ItemDraft = { readonly tags: readonly string[]; readonly knownItems: readonly string[] };

export type ItemUpdate = { readonly add: ItemPatch; readonly remove: ItemPatch; readonly changed: boolean };

export const toItemDraft = (item: Item): ItemDraft => ({ tags: Object.keys(item.tags ?? {}), knownItems: Object.keys(item.knownItems ?? {}) });

/** Only what changed between the stored item and the draft. */
export function buildItemUpdate(stored: Item, draft: ItemDraft): ItemUpdate {
  const tags = diffBag(stored.tags, draft.tags);
  const knownItems = diffBag(stored.knownItems, draft.knownItems);
  const add: ItemPatch = {
    ...(tags.add.length > 0
      ? { tags: tags.add }
      : {}),
    ...(knownItems.add.length > 0
      ? { knownItems: knownItems.add }
      : {}),
  };
  const remove: ItemPatch = {
    ...(tags.remove.length > 0
      ? { tags: tags.remove }
      : {}),
    ...(knownItems.remove.length > 0
      ? { knownItems: knownItems.remove }
      : {}),
  };
  return { add, remove, changed: Object.keys(add).length + Object.keys(remove).length > 0 };
}
