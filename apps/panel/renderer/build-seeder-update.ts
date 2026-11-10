import type { Bag, ConditionValues, Seeder, SeederPatch, SeederRemoval, SplitSettings } from "@poe/panel-state/types";
import { SPLIT_DEFAULTS } from "@poe/panel-state/split-defaults";
import { diffBag } from "./diff-bag.ts";

export type SeederDraft = {
  readonly name: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly names: readonly string[];
  readonly conditions: Readonly<Record<string, ConditionValues>>;
  /** Whether each condition splits, defaults included. */
  readonly split: SplitSettings;
};

export type SeederUpdate = {
  readonly add: SeederPatch;
  readonly remove: SeederRemoval;
  readonly tags: { readonly add: readonly string[]; readonly remove: readonly string[] };
  readonly changed: boolean;
};

/** Tells whether a condition splits when the seeder sets nothing. */
export const splitsByDefault = (condition: string): boolean =>
  SPLIT_DEFAULTS[condition] ?? true;

/** The stored seeder and its tags as an editable draft. */
export const toSeederDraft = (name: string, category: string, seeder: Seeder, tags: Bag | undefined): SeederDraft => ({
  name,
  category,
  tags: Object.keys(tags ?? {}),
  names: Object.keys(seeder.names ?? {}),
  conditions: seeder.conditions ?? {},
  split: Object.fromEntries(Object.keys(seeder.conditions ?? {}).map((condition) => [condition, seeder.split?.[condition] ?? splitsByDefault(condition)])),
});

/** The values to add and remove per condition, `null` dropping a condition the draft left out or emptied. */
function diffConditions(stored: Readonly<Record<string, ConditionValues>>, draft: SeederDraft["conditions"]) {
  const names = [...new Set([...Object.keys(stored), ...Object.keys(draft)])];
  const add: Record<string, ConditionValues> = {};
  const remove: Record<string, readonly string[] | null> = {};

  for (const name of names) {
    const drafted = Object.entries(draft[name] ?? {});
    const kept = stored[name] ?? {};
    const added = drafted.filter(([value, operator]) => kept[value] !== operator);
    const removed = Object.keys(kept).filter((value) => draft[name]?.[value] === undefined);
    if (added.length > 0) add[name] = Object.fromEntries(added);
    if (drafted.length === 0 && stored[name] !== undefined) remove[name] = null;
    else if (removed.length > 0) remove[name] = removed;
  }
  return { add, remove };
}

/** The overrides to set and drop so the seeder splits as the draft does. */
function diffSplit(stored: SplitSettings = {}, draft: SeederDraft) {
  const add: Record<string, boolean> = {};
  const conditions = Object.keys(draft.conditions);
  const remove = Object.keys(stored).filter((condition) => !conditions.includes(condition) || draft.split[condition] === splitsByDefault(condition));

  for (const condition of conditions) {
    const wanted = draft.split[condition] ?? splitsByDefault(condition);
    if (wanted !== splitsByDefault(condition) && stored[condition] !== wanted) add[condition] = wanted;
  }
  return { add, remove };
}

/** Only what changed between the stored seeder, its tags and the draft. Tags, name and category are separate commands. */
export function buildSeederUpdate(stored: Seeder, storedTags: Bag | undefined, draft: SeederDraft): SeederUpdate {
  const tags = diffBag(storedTags, draft.tags);
  const names = diffBag(stored.names, draft.names);
  const conditions = diffConditions(stored.conditions ?? {}, draft.conditions);
  const split = diffSplit(stored.split, draft);
  const add: SeederPatch = {
    ...(names.add.length > 0
      ? { names: names.add }
      : {}),
    ...(Object.keys(conditions.add).length > 0
      ? { conditions: conditions.add }
      : {}),
    ...(Object.keys(split.add).length > 0
      ? { split: split.add }
      : {}),
  };
  const remove: SeederRemoval = {
    ...(names.remove.length > 0
      ? { names: names.remove }
      : {}),
    ...(Object.keys(conditions.remove).length > 0
      ? { conditions: conditions.remove }
      : {}),
    ...(split.remove.length > 0
      ? { split: split.remove }
      : {}),
  };
  return { add, remove, tags, changed: Object.keys(add).length + Object.keys(remove).length > 0 };
}
