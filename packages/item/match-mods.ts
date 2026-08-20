/**
 * Turning a modifier's text into the stat ids the trade site knows it by.
 *
 * The list of stats is GGG's own, fetched by `@poe/ggg/get-stats` and cached for an hour.
 * Nothing about a modifier is written down here: a modifier that ships next league is
 * matched the day it appears in that list, and this file does not change. That is the whole
 * maintenance story, and it is why matching is done against published text rather than
 * against anything this package could have got out of date.
 *
 * Four rules do the work, and all four came out of measuring the sample items against the
 * published list:
 *
 * 1. Take the range off the roll first. The game prints `+149(145-159) to maximum Life`
 *    where GGG publishes `+# to maximum Life`, and `statKey` on its own reads the game's
 *    notation as two numbers rather than one.
 * 2. Try the modifier's lines joined before trying them apart. A quarter of the published
 *    stats span several lines, and a hybrid modifier is one stat, not two.
 * 3. Prefer a candidate whose type the header asked for. GGG publishes the same wording
 *    under `explicit`, `implicit`, `fractured` and `crafted` at once, and the `{ … }` header
 *    is the only thing on the item that says which one this is.
 * 4. On a miss, try the modifier written the other way round. GGG indexes one direction of
 *    a scaling modifier and searches the other with a negative number.
 *
 * Nothing is filtered away — a candidate whose type nobody asked for is still returned,
 * behind the ones that were. A modifier this cannot place keeps an empty list and is
 * reported, because a wrong stat id is worse than a missing one.
 */

import { statIndex } from "@util/core/stat-index";
import type { TradeStatEntry } from "@poe/ggg/types";
import { derollText, invertScaling } from "./mod-text.ts";
import type { ItemMod, ResolvedMod, StatMatch } from "./types.ts";

/** One published stat, with an option already chosen when it has any. */
type IndexedStat = {
  readonly id: string;
  readonly text: string;
  readonly type: string;
  readonly option: string | number | undefined;
};

/** What stands where a stat writes `#`. */
const NUMBER_GROUP = "(-?\\d+(?:\\.\\d+)?)";

/** The characters a regex would otherwise read as syntax. */
const META = /[.*+?^${}()|[\]\\]/g;

/**
 * The type a header implies when none of its words names one.
 *
 * An implicit is an implicit. Everything else — a prefix, a suffix, a unique's modifier,
 * a monster's — is published as `explicit` or not published at all, and guessing `explicit`
 * for something GGG never published costs nothing because there is no candidate either way.
 */
const defaultType = (mod: ItemMod) => (mod.header.affix === "implicit" ? "implicit" : "explicit");

/**
 * Every stat as one indexable entry, with an `option` list expanded into an entry each.
 *
 * A stat with options publishes its text with a `#` where the option's words go, and the
 * item prints the words. Expanding here means the index is keyed on what the item actually
 * says, and the option that was chosen travels with the match so a trade query can name it.
 */
function expand(stats: readonly TradeStatEntry[]): readonly IndexedStat[] {
  return stats.flatMap<IndexedStat>((stat) => {
    const options = stat.option?.options;

    if (options === undefined || options.length === 0) {
      return [{ id: stat.id, text: stat.text, type: stat.type, option: undefined }];
    }

    return options.map((option) => ({
      id: stat.id,
      text: stat.text.replace("#", option.text),
      type: stat.type,
      option: option.id,
    }));
  });
}

/**
 * The numbers standing where the stat writes `#`, or `undefined` when the two texts do not
 * line up literally.
 *
 * They can fail to line up and still be the same stat: `statKey` matches them after blanking
 * every number and stemming plurals, so `per 10 Dexterity` and `per 12 Dexterity` share a
 * key. The caller falls back to the rolls the game printed.
 */
function alignValues(statText: string, itemText: string): readonly number[] | undefined {
  const pattern = statText
    .split("#")
    .map((part) => part.replace(META, "\\$&").replace(/\s+/g, "\\s+"))
    .join(NUMBER_GROUP);

  const found = new RegExp(`^${pattern}$`, "i").exec(itemText.trim());

  return found === undefined || found === null ? undefined : found.slice(1).map(Number);
}

/** A matcher over one snapshot of the published stat list. */
export type ModMatcher = {
  /** Every stat a modifier could be, preferred first, plus any pseudo alias. */
  match(mod: ItemMod): {
    readonly stats: readonly StatMatch[];
    readonly pseudos: readonly StatMatch[];
  };
};

/**
 * Builds the matcher. Do this once per list, not once per item — it indexes eighteen
 * thousand entries.
 *
 * The set of stat types is read off the list rather than written down, so a type GGG adds
 * later is recognised in a header the moment it appears.
 */
export function modMatcher(stats: readonly TradeStatEntry[]): ModMatcher {
  const expanded = expand(stats);
  const types = new Set(expanded.map((stat) => stat.type));

  const real = statIndex(
    expanded.filter((stat) => stat.type !== "pseudo"),
    (stat) => stat.text,
  );
  const pseudo = statIndex(
    expanded.filter((stat) => stat.type === "pseudo"),
    (stat) => stat.text,
  );

  return {
    match(mod) {
      const wanted = new Set(
        mod.header.qualifiers.map((word) => word.toLowerCase()).filter((word) => types.has(word)),
      );
      if (wanted.size === 0) wanted.add(defaultType(mod));

      const joined = mod.lines.map((line) => line.text).join("\n");

      const rolled = mod.lines.flatMap((line) => line.rolls.map((roll) => roll.value));

      const asMatch = (stat: IndexedStat, attempt: string): StatMatch => ({
        id: stat.id,
        text: stat.text,
        type: stat.type,
        option: stat.option,
        values: alignValues(stat.text, attempt) ?? rolled,
        preferred: wanted.has(stat.type),
      });

      /** One text, tried as printed and then written the other way round. */
      const lookup = (text: string) => {
        const derolled = derollText(text);

        for (const attempt of [derolled, invertScaling(derolled)]) {
          if (attempt === undefined) continue;

          const found = real.find(attempt);
          const aliases = pseudo.find(attempt);

          // A pseudo on its own is a hit. The trade site publishes the temple rooms, the
          // logbook areas and the lake reflections under a pseudo id and no other, so a
          // modifier can be searchable without being an explicit or an implicit.
          if (found.length === 0 && aliases.length === 0) continue;

          return {
            // A stable sort, so candidates of one type keep the order GGG published them in.
            stats: found
              .map((stat) => asMatch(stat, attempt))
              .sort((left, right) => Number(right.preferred) - Number(left.preferred)),
            pseudos: aliases.map((stat) => asMatch(stat, attempt)),
          };
        }

        return undefined;
      };

      // Joined first: GGG publishes a quarter of its stats across several lines, and a
      // hybrid modifier that has one of those is one stat rather than two.
      const whole = lookup(joined);
      if (whole !== undefined) return whole;
      if (mod.lines.length === 1) return { stats: [], pseudos: [] };

      // Apart, when it is not. `17% increased Global Accuracy Rating` and
      // `15% increased Light Radius` share a header and are two published stats, so every
      // line gets its own look rather than the first hit ending the search.
      const perLine = mod.lines.map((line) => lookup(line.text)).filter((found) => found !== undefined);

      return {
        stats: perLine.flatMap((found) => found.stats),
        pseudos: perLine.flatMap((found) => found.pseudos),
      };
    },
  };
}

/** A modifier with its matches attached. */
export const resolveMod = (mod: ItemMod, matcher: ModMatcher): ResolvedMod => ({
  ...mod,
  ...matcher.match(mod),
});
