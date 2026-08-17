import { findCollisions } from "../../core/collisions.ts";
import type { RawStatEntry, RawStats } from "./raw.ts";
import type { Stat, StatGroup, Stats } from "./domain.ts";

export function transformStats(raw: RawStats): Stats {
  const groups = raw.result.map(toGroup);
  const stats = groups.flatMap((group) => group.stats);
  const collisions = findCollisions(stats);

  return {
    totals: {
      groups: groups.length,
      stats: stats.length,
      withPlaceholders: stats.filter((stat) => stat.placeholders > 0).length,
      withOptions: stats.filter((stat) => stat.options.length > 0).length,
      collidingIds: collisions.length,
    },
    collisions,
    groups,
  };
}

/** Group order is meaningful (pseudo first, then explicit, ...) so it is kept as-is. */
function toGroup(group: RawStats["result"][number]): StatGroup {
  const stats = group.entries.map((entry) => toStat(entry, group.id)).sort(byIdThenText);
  return { id: group.id, label: group.label, count: stats.length, stats };
}

function toStat(entry: RawStatEntry, group: string): Stat {
  return {
    id: entry.id,
    group,
    text: entry.text,
    lines: entry.text.split("\n"),
    placeholders: countPlaceholders(entry.text),
    options: (entry.option?.options ?? []).map((option) => ({
      value: option.id,
      label: option.text,
    })),
  };
}

function countPlaceholders(text: string): number {
  let count = 0;
  for (const character of text) if (character === "#") count++;
  return count;
}

/** Sorted so the committed output diffs cleanly when GGG reorders entries. */
function byIdThenText(a: Stat, b: Stat): number {
  return a.id.localeCompare(b.id) || a.text.localeCompare(b.text);
}
