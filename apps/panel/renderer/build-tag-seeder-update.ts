import type { TagSeeder, TagSeederPatch, TagSeederRemoval } from "@poe/panel-state/types";
import { diffBag } from "./diff-bag.ts";

export type TagSeederDraft = {
  readonly name: string;
  readonly conditions: Readonly<Record<string, readonly string[]>>;
  readonly tags: readonly string[];
};

export type TagSeederUpdate = { readonly add: TagSeederPatch; readonly remove: TagSeederRemoval; readonly changed: boolean };

export const EMPTY_TAG_SEEDER_DRAFT: TagSeederDraft = { name: "", conditions: {}, tags: [] };

/** The stored tag seeder as an editable draft. */
export const toTagSeederDraft = (name: string, tagSeeder: TagSeeder): TagSeederDraft => ({
  name,
  conditions: Object.fromEntries(Object.entries(tagSeeder.conditions).map(([condition, values]) => [condition, Object.keys(values)])),
  tags: Object.keys(tagSeeder.tags),
});

/** Tells whether the draft can be stored: a name, a tag, and at least one condition with a value. */
export const isCompleteDraft = (draft: TagSeederDraft): boolean =>
  draft.name.trim() !== "" && draft.tags.length > 0 && Object.values(draft.conditions).some((values) => values.length > 0);

/** The values to add and remove per condition, `null` dropping a condition the draft left out or emptied. */
function diffConditions(stored: TagSeeder["conditions"], draft: TagSeederDraft["conditions"]) {
  const names = [...new Set([...Object.keys(stored), ...Object.keys(draft)])];
  const changes = names.map((name) => ({ name, values: diffBag(stored[name], draft[name] ?? []), emptied: (draft[name] ?? []).length === 0 }));
  const added = changes.filter((change) => change.values.add.length > 0).map((change) => [change.name, change.values.add] as const);
  const removed = changes.flatMap((change): (readonly [string, readonly string[] | null])[] => {
    if (change.emptied && stored[change.name] !== undefined) return [[change.name, null]];
    return change.values.remove.length > 0
      ? [[change.name, change.values.remove]]
      : [];
  });
  return { add: Object.fromEntries(added), remove: Object.fromEntries(removed) };
}

/** Only what changed between the stored tag seeder and the draft. The name is a separate command. */
export function buildTagSeederUpdate(stored: TagSeeder, draft: TagSeederDraft): TagSeederUpdate {
  const tags = diffBag(stored.tags, draft.tags);
  const conditions = diffConditions(stored.conditions, draft.conditions);
  const add: TagSeederPatch = {
    ...(Object.keys(conditions.add).length > 0
      ? { conditions: conditions.add }
      : {}),
    ...(tags.add.length > 0
      ? { tags: tags.add }
      : {}),
  };
  const remove: TagSeederRemoval = {
    ...(Object.keys(conditions.remove).length > 0
      ? { conditions: conditions.remove }
      : {}),
    ...(tags.remove.length > 0
      ? { tags: tags.remove }
      : {}),
  };
  return { add, remove, changed: Object.keys(add).length + Object.keys(remove).length > 0 };
}
