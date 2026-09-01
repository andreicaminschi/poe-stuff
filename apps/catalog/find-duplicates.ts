import { readFileSync } from "node:fs";
import type { Item } from "./item.ts";

/** One display name carried by more than one metadata id. */
export type DuplicateName = {
  readonly name: string;
  readonly ids: readonly string[];
  /** The `item_class` behind each id, deduplicated. One entry means one kind of thing. */
  readonly classes: readonly string[];
  readonly categories: readonly string[];
};

/** A clash somebody has already ruled on, and why. */
export type KnownDuplicate = {
  readonly name: string;
  readonly ids: readonly string[];
  readonly reason: string;
};

/** A known clash as the report gives it back: what was found, beside what was recorded. */
export type SettledDuplicate = DuplicateName & {
  readonly reason: string;
};

export type DuplicateReport = {
  readonly runId: string;
  readonly rows: number;
  readonly names: number;
  /** Names whose ids are not all accounted for. The ones to look at. */
  readonly duplicates: readonly DuplicateName[];
  /** Names every id of which is recorded in `known-duplicates.json`, with the reason. */
  readonly known: readonly SettledDuplicate[];
};

/**
 * Clashes already looked at, each with the ids it covers and why it is accepted.
 *
 * Hand-maintained, and read rather than compiled in, so it can be edited with `jq`. The
 * reason is the point of the file: an id list alone records that somebody decided, not what
 * they decided.
 */
export const knownDuplicates = (): readonly KnownDuplicate[] =>
  JSON.parse(
    readFileSync(
      new URL("find-duplicates/known-duplicates.json", import.meta.url),
      "utf8",
    ),
  ) as KnownDuplicate[];

const unique = (values: readonly string[]) => [...new Set(values)].sort();

/**
 * Every name carried by more than one id, split by whether the clash has been ruled on.
 *
 * **A name is known only when every one of its ids is.** Listing two quiver ids settles
 * `Spike-Point Arrow Quiver` — until GGG adds a third, at which point the name comes back
 * as an open duplicate carrying all three, because the new id is a thing nobody has looked
 * at yet.
 */
export function findDuplicates(
  runId: string,
  rows: readonly Item[],
  known: readonly KnownDuplicate[],
): DuplicateReport {
  const recorded = new Map(known.map((entry) => [entry.name, entry]));
  const byName = new Map<string, Item[]>();

  for (const row of rows) {
    const name = row.name ?? row.key;
    const seen = byName.get(name);
    if (seen === undefined) byName.set(name, [row]);
    else seen.push(row);
  }

  const clashes: DuplicateName[] = [];

  for (const [name, group] of byName) {
    if (group.length < 2) continue;

    clashes.push({
      name,
      ids: unique(group.map((row) => row.key)),
      classes: unique(group.map((row) => row.itemClass ?? "-")),
      categories: unique(group.map((row) => row.category ?? "-")),
    });
  }

  const order = (a: DuplicateName, b: DuplicateName) =>
    b.ids.length - a.ids.length || a.name.localeCompare(b.name);

  /** The record for a clash, or nothing when it covers fewer ids than were found. */
  const settled = (clash: DuplicateName): KnownDuplicate | undefined => {
    const entry = recorded.get(clash.name);

    return entry !== undefined && clash.ids.every((id) => entry.ids.includes(id))
      ? entry
      : undefined;
  };

  return {
    runId,
    rows: rows.length,
    names: byName.size,
    duplicates: clashes.filter((clash) => settled(clash) === undefined).sort(order),
    known: clashes
      .flatMap((clash) => {
        const entry = settled(clash);
        return entry === undefined ? [] : [{ ...clash, reason: entry.reason }];
      })
      .sort(order),
  };
}
