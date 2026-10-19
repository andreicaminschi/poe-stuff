import type { Seeder, SeederPatch, SeederRemoval } from "@poe/panel-state/types";
import { diffBag } from "./diff-bag.ts";

export type SeederDraft = {
  readonly tags: readonly string[];
  readonly knownItems: readonly string[];
  readonly conditions: Readonly<Record<string, readonly string[]>>;
};

export type SeederUpdate = { readonly add: SeederPatch; readonly remove: SeederRemoval; readonly changed: boolean };

/** The stored seeder as an editable draft. */
export const toSeederDraft = (seeder: Seeder): SeederDraft => ({
  tags: Object.keys(seeder.tags ?? {}),
  knownItems: Object.keys(seeder.knownItems ?? {}),
  conditions: Object.fromEntries(Object.entries(seeder.conditions ?? {}).map(([name, bag]) => [name, Object.keys(bag)])),
});

function diffConditions(stored: Seeder["conditions"] = {}, draft: SeederDraft["conditions"]) {
  const names = [...new Set([...Object.keys(stored), ...Object.keys(draft)])];
  const add: Record<string, readonly string[]> = {};
  const remove: Record<string, readonly string[] | null> = {};
  for (const name of names) {
    const drafted = draft[name] ?? [];
    const diff = diffBag(stored[name], drafted);
    if (diff.add.length > 0) add[name] = diff.add;
    if (drafted.length === 0 && stored[name] !== undefined) remove[name] = null;
    else if (diff.remove.length > 0) remove[name] = diff.remove;
  }
  return { add, remove };
}

/** Only what changed between the stored seeder and the draft. */
export function buildSeederUpdate(stored: Seeder, draft: SeederDraft): SeederUpdate {
  const tags = diffBag(stored.tags, draft.tags);
  const knownItems = diffBag(stored.knownItems, draft.knownItems);
  const conditions = diffConditions(stored.conditions, draft.conditions);
  const add: SeederPatch = {
    ...(tags.add.length > 0
      ? { tags: tags.add }
      : {}),
    ...(knownItems.add.length > 0
      ? { knownItems: knownItems.add }
      : {}),
    ...(Object.keys(conditions.add).length > 0
      ? { conditions: conditions.add }
      : {}),
  };
  const remove: SeederRemoval = {
    ...(tags.remove.length > 0
      ? { tags: tags.remove }
      : {}),
    ...(knownItems.remove.length > 0
      ? { knownItems: knownItems.remove }
      : {}),
    ...(Object.keys(conditions.remove).length > 0
      ? { conditions: conditions.remove }
      : {}),
  };
  return { add, remove, changed: Object.keys(add).length + Object.keys(remove).length > 0 };
}
