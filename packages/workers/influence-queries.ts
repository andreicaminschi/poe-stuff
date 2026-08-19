import type { TradeStatEntry } from "@poe/ggg/types";
import type { Influence, InfluenceMod } from "@poe/poe-wiki/types";
import { statIndex } from "@util/core/stat-index";
import type { Query } from "./queries.ts";

/**
 * One trade search per influence modifier per tier.
 *
 * The tier is the point. A modifier is not a price — the top tier of a modifier and the
 * tier below it are different items in a different market, and the only thing separating
 * them in a search is the value the roll is bounded to. So the grain here is one wiki mod
 * row, which is already one tier, and every query carries the bounds that pin it.
 *
 * Nothing is fetched here: the stats and the mods are handed in, so this is a pure
 * function of two lists and can be run again against a saved pair.
 */

/** What the searches are for. Below this an influenced base is not worth listing. */
export const MIN_ITEM_LEVEL = 84;

/**
 * The pseudo stat carrying each influence. These are the only place GGG exposes influence
 * to a search — there is no misc filter for it — and they take no value: the id being
 * present is the requirement.
 */
const INFLUENCE_STAT: Record<Influence, string> = {
  Shaper: "pseudo.pseudo_has_shaper_influence",
  Elder: "pseudo.pseudo_has_elder_influence",
  Crusader: "pseudo.pseudo_has_crusader_influence",
  Redeemer: "pseudo.pseudo_has_redeemer_influence",
  Hunter: "pseudo.pseudo_has_hunter_influence",
  Warlord: "pseudo.pseudo_has_warlord_influence",
};

/** `Has # Influences`, bounded to one: two influences is a different, dearer item. */
const INFLUENCE_COUNT_STAT = "pseudo.pseudo_has_influence_count";

/** The first roll in a line: a bracketed range, or the first bare number. */
const FIRST_ROLL = /\(([-\d.]+)\s*-\s*(-?[\d.]+)\)|(-?\d+(?:\.\d+)?)/;

/** How many rolls a line spells out. More than one and the bounds are the first only. */
const ALL_ROLLS = /\([-\d.]+\s*-\s*-?[\d.]+\)|-?\d+(?:\.\d+)?/g;

type Bounds = { min: number; max: number };

type StatFilter = {
  readonly id: string;
  readonly value?: Bounds;
};

type StatGroup =
  | { readonly type: "and"; readonly filters: readonly StatFilter[] }
  | {
      readonly type: "count";
      readonly value: { readonly min: number };
      readonly filters: readonly StatFilter[];
    };

/** One modifier no stat in the list can search for. */
export type UnmatchedMod = {
  readonly id: string;
  readonly influence: Influence;
  readonly modifier: string;
  /** Only the lines that failed. A hybrid can have one of each. */
  readonly lines: readonly string[];
  /** The highest spawn weight any slot gives it. Always above zero. */
  readonly weight: number;
};

export type InfluenceQueryReport = {
  readonly queries: readonly Query[];
  readonly unmatched: readonly UnmatchedMod[];
  readonly counts: {
    readonly rows: number;
    /** Distinct droppable modifiers, which is what a query is made from. */
    readonly mods: number;
    readonly queries: number;
    /** Modifiers left out for carrying no spawn weight on any slot. */
    readonly undroppable: number;
    /** Lines matched only by reading `reduced` as a negative `increased`. */
    readonly negated: number;
    /** Lines several stat ids answer to, searched as a count group. */
    readonly ambiguous: number;
    /** Lines spelling out more than one roll, where the bounds are the first only. */
    readonly multiRoll: number;
  };
};

/** Low and high of the first roll, in that order however the wiki wrote it. */
function bounds(line: string): Bounds | undefined {
  const match = FIRST_ROLL.exec(line);
  if (match === null) return undefined;

  const [low, high] =
    match[3] === undefined
      ? [Number(match[1]), Number(match[2])]
      : [Number(match[3]), Number(match[3])];

  if (!Number.isFinite(low) || !Number.isFinite(high)) return undefined;

  return { min: Math.min(low, high), max: Math.max(low, high) };
}

/** A `reduced` roll is the `increased` stat with the sign turned around. */
const negate = ({ min, max }: Bounds): Bounds => ({ min: -max, max: -min });

/**
 * The stats that answer for one line of a modifier.
 *
 * GGG publishes no `reduced` stats: the search for `#% reduced Elemental Damage taken` is
 * the `increased` one with a negative value. So a line matching nothing is tried again
 * with the word flipped, and its bounds come back negated.
 */
function resolveLine(
  line: string,
  index: ReturnType<typeof statIndex<TradeStatEntry>>,
): { stats: readonly TradeStatEntry[]; value?: Bounds; negated: boolean } {
  const value = bounds(line);

  const direct = index.find(line);
  if (direct.length > 0) return { stats: direct, value, negated: false };

  if (!/reduced/i.test(line)) return { stats: [], negated: false };

  const flipped = index.find(line.replace(/reduced/gi, "increased"));

  return {
    stats: flipped,
    value: value === undefined ? undefined : negate(value),
    negated: flipped.length > 0,
  };
}

/**
 * One row per modifier rather than per slot. The wiki's grain is one row per slot, so a
 * modifier rolling on eight bases is eight identical rows — and the slot is not in the
 * query, because an influenced base is worth pricing wherever it landed.
 *
 * Weight is the highest any slot gives it: droppable somewhere is droppable. Weight zero
 * everywhere is dropped outright — those are the Elevated and crafted-only rows, and a
 * search for a modifier nothing can drop with is a request spent on an empty market.
 */
function byMod(mods: readonly InfluenceMod[]): Map<string, InfluenceMod> {
  const deduped = new Map<string, InfluenceMod>();

  for (const mod of mods) {
    const seen = deduped.get(mod.id);
    if (seen === undefined || mod.weight > seen.weight) deduped.set(mod.id, mod);
  }

  for (const [id, mod] of deduped) if (mod.weight === 0) deduped.delete(id);

  return deduped;
}

/**
 * Tier one is the strongest. Modifiers sharing an influence and a set of stat ids are one
 * modifier at different strengths, which is what a tier is.
 *
 * Ranked by required level first and by the top of the roll second. The level alone is
 * not enough: two tiers unlocking at the same level but rolling different ranges are the
 * same modifier on different bases — a body armour tier beside a helmet one — and they
 * are not the same tier. Rows agreeing on both share a number.
 *
 * Everything here can drop — the rest was dropped in `byMod` — so the numbering is over
 * the tiers that actually exist on the market.
 */
function tiers(
  entries: readonly { key: string; mod: InfluenceMod }[],
): Map<string, number> {
  const ranks = new Map<string, number>();
  const groups = new Map<string, InfluenceMod[]>();

  for (const { key, mod } of entries) {
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [mod]);
    else group.push(mod);
  }

  for (const group of groups.values()) {
    const strengthOf = (mod: InfluenceMod) =>
      `${mod.requiredLevel}|${bounds(mod.modifier)?.max ?? 0}`;

    const ordered = [
      ...new Set(group.map(strengthOf)),
    ].sort((a, b) => {
      const [levelA = 0, rollA = 0] = a.split("|").map(Number);
      const [levelB = 0, rollB = 0] = b.split("|").map(Number);

      return levelB - levelA || rollB - rollA;
    });

    for (const mod of group) {
      ranks.set(mod.id, ordered.indexOf(strengthOf(mod)) + 1);
    }
  }

  return ranks;
}

/**
 * The modifier itself, in one line. The affix name — `of Shaping` — is deliberately not
 * used: two tiers of the same modifier share it, and the whole point of a name here is
 * telling those two apart at a glance.
 */
const label = (mod: InfluenceMod) =>
  mod.modifier.replace(/\s+/g, " ").slice(0, 70);

/**
 * Every influence modifier as a trade search: item level 84 and up, uncorrupted,
 * unmirrored, unfractured, carrying that one influence and no second one.
 *
 * A line several stat ids answer to becomes a count group rather than a choice. GGG
 * indexes the same wording more than once — `Socketed Gems are Supported by Level #
 * Chance To Bleed` exists three times over, differing in capitals — and an item indexed
 * under one is invisible to the others, so the search asks for any of them.
 */
export function buildInfluenceQueries(
  stats: readonly TradeStatEntry[],
  mods: readonly InfluenceMod[],
  league: string,
): InfluenceQueryReport {
  const index = statIndex(
    stats.filter((stat) => stat.type === "explicit"),
    (stat) => stat.text,
  );

  const deduped = [...byMod(mods).values()];
  const unmatched: UnmatchedMod[] = [];
  const resolved: {
    mod: InfluenceMod;
    groups: StatGroup[];
    single: StatFilter[];
    key: string;
  }[] = [];

  let negated = 0;
  let ambiguous = 0;
  let multiRoll = 0;

  for (const mod of deduped) {
    const lines = mod.modifier.split("\n").filter((line) => line.trim() !== "");
    const groups: StatGroup[] = [];
    const single: StatFilter[] = [];
    const missing: string[] = [];
    const ids: string[] = [];

    for (const line of lines) {
      const hit = resolveLine(line, index);

      if (hit.stats.length === 0) {
        missing.push(line);
        continue;
      }

      if (hit.negated) negated += 1;
      if ((line.match(ALL_ROLLS) ?? []).length > 1) multiRoll += 1;

      const filters: StatFilter[] = hit.stats.map((stat) => ({
        id: stat.id,
        ...(hit.value === undefined ? {} : { value: hit.value }),
      }));

      ids.push(...filters.map((filter) => filter.id));

      const first = filters[0];
      if (filters.length === 1 && first !== undefined) {
        single.push(first);
      } else {
        ambiguous += 1;
        groups.push({ type: "count", value: { min: 1 }, filters });
      }
    }

    if (missing.length > 0) {
      unmatched.push({
        id: mod.id,
        influence: mod.influence,
        modifier: mod.modifier,
        lines: missing,
        weight: mod.weight,
      });
      continue;
    }

    resolved.push({
      mod,
      groups,
      single,
      key: `${mod.influence}|${[...ids].sort().join(",")}`,
    });
  }

  const ranks = tiers(resolved.map(({ key, mod }) => ({ key, mod })));

  const queries = resolved.map(({ mod, groups, single }): Query => {
    const tier = ranks.get(mod.id) ?? 0;

    return {
      id: `influence-${mod.id}`,
      name: `${mod.influence} T${tier} ${label(mod)}`,
      league,
      active: true,
      body: {
        query: {
          status: { option: "online" },
          stats: [
            {
              type: "and",
              filters: [
                { id: INFLUENCE_STAT[mod.influence] },
                { id: INFLUENCE_COUNT_STAT, value: { min: 1, max: 1 } },
                ...single,
              ],
            },
            ...groups,
          ],
          filters: {
            misc_filters: {
              filters: {
                ilvl: { min: MIN_ITEM_LEVEL },
                corrupted: { option: "false" },
                mirrored: { option: "false" },
                fractured_item: { option: "false" },
              },
            },
          },
        },
        sort: { price: "asc" },
      },
    };
  });

  return {
    queries,
    unmatched,
    counts: {
      rows: mods.length,
      mods: deduped.length,
      queries: queries.length,
      undroppable: new Set(mods.map((mod) => mod.id)).size - deduped.length,
      negated,
      ambiguous,
      multiRoll,
    },
  };
}
