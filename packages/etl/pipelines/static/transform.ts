import { findCollisions } from "../../core/collisions.ts";
import type { StaticData, StaticGroup, StaticItem } from "./domain.ts";
import type { RawStaticEntry, RawStaticGroup, RawStatic } from "./raw.ts";

/** GGG's dropdown separator, repeated within groups instead of given a real id. */
const SEPARATOR_ID = "sep";

export function transformStatic(raw: RawStatic): StaticData {
  const groups = raw.result.map(toGroup);
  const items = groups.flatMap((group) => group.items);
  const collisions = findCollisions(items.filter((item) => !item.separator));

  return {
    totals: {
      groups: groups.length,
      items: items.length,
      withImage: items.filter((item) => item.image !== null).length,
      pseudo: items.filter((item) => item.pseudo).length,
      separators: items.filter((item) => item.separator).length,
      collidingIds: collisions.length,
    },
    collisions,
    groups,
  };
}

/** Group order is meaningful (Currency first, Misc last) so it is kept as-is. */
function toGroup(group: RawStaticGroup): StaticGroup {
  const items = group.entries.map((entry) => toItem(entry, group.id)).sort(byIdThenText);
  return { id: group.id, label: group.label, count: items.length, items };
}

function toItem(entry: RawStaticEntry, group: string): StaticItem {
  return {
    id: entry.id,
    group,
    text: entry.text,
    subtext: entry.subtext ?? null,
    description: entry.description ?? null,
    image: entry.image ?? null,
    pseudo: entry.pseudo ?? false,
    separator: entry.id === SEPARATOR_ID,
  };
}

/** Sorted so the committed output diffs cleanly when GGG reorders entries. */
function byIdThenText(a: StaticItem, b: StaticItem): number {
  return a.id.localeCompare(b.id) || a.text.localeCompare(b.text);
}
