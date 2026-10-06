import diff from "microdiff";
import { flagOverwrites } from "./summarize-diff/flag-overwrites.ts";
import { groupFacts } from "./summarize-diff/group-facts.ts";
import { listFacts } from "./summarize-diff/list-facts.ts";
import { pairMoves } from "./summarize-diff/pair-moves.ts";
import { pairRenames } from "./summarize-diff/pair-renames.ts";
import { pruneShared } from "./summarize-diff/prune-shared.ts";
import { renderLine } from "./summarize-diff/render-line.ts";
import { sortGroups } from "./summarize-diff/sort-groups.ts";
import type { Snapshots, SummaryConfig } from "./types.ts";

/**
 * Describes what one agent step changed, in a few plain lines the Judge reads instead of raw
 * state. `start` is the state when the request began, so a step that undoes an earlier step's
 * work is flagged.
 *
 * @example
 * summarizeDiff({ start, before, after }, config);
 * // → ["33/33 seeders in Bases: condition FracturedItem set to true", "seeder \"Rings\": tag chase removed (added earlier in this request)"]
 */
export function summarizeDiff(snapshots: Snapshots, config: SummaryConfig): readonly string[] {
  const pruned = pruneShared(snapshots.before, snapshots.after);
  const changes = diff(pruned.before, pruned.after).map((change) => ({ ...change, path: change.path.map(String) }));
  const facts = flagOverwrites(pairMoves(pairRenames(listFacts(changes, config)), config), snapshots.start, snapshots.before);
  const lines = sortGroups(groupFacts(facts, snapshots.before)).map((group) => renderLine(group, config));

  return lines.length === 0
    ? ["no changes"]
    : lines;
}
