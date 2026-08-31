/**
 * An item with its modifiers looked up in the published stat list.
 *
 * The split from `parseItem` is deliberate: parsing is pure and needs nothing, matching
 * needs eighteen thousand stats fetched over the network. Everything that can be tested
 * without a stat list is tested without one, and a caller reading items in a loop builds
 * the matcher once and hands it to every call here.
 */

import { modMatcher, resolveMod, type ModMatcher } from "./match-mods.ts";
import type { ParsedItem, ResolvedItem } from "./types.ts";

/** Builds a matcher over one snapshot of the stat list. Re-export, so callers need one import. */
export { modMatcher, type ModMatcher };

/**
 * Every modifier resolved.
 *
 * A modifier that matched nothing keeps an empty `stats` and its text is listed in
 * `unmatched`. Most of those are not tradeable stats at all — a beast's monster modifiers,
 * a map's implicit, a flask's charge modifiers — and a few are wordings GGG publishes
 * differently. Either way the modifier is still on the item, so it is still on the result.
 */
export function resolveItem(item: ParsedItem, matcher: ModMatcher): ResolvedItem {
  const mods = item.mods.map((mod) => resolveMod(mod, matcher));

  return {
    ...item,
    mods,
    unmatched: mods
      .filter((mod) => mod.stats.length === 0 && mod.pseudos.length === 0)
      .map((mod) => mod.lines.map((line) => line.text).join("\n")),
  };
}
