import { TYPE_RULES, groupFor } from "./item-types.ts";
import type { TypeRule } from "./item-types.ts";
import type {
  ItemOverviewLine,
  ItemType,
} from "./get-item-overview.types.ts";
import type { NinjaItem } from "./get-league-items.types.ts";

/**
 * One poe.ninja row, in the shape a filter reads a market through.
 *
 * Three of the fields below are the whole reason this file is not a rename table.
 * poe.ninja publishes them in a form the game does not use, and a caller that took them
 * literally would be wrong in a way nothing downstream could detect:
 *
 * 1. **`gemQuality` is absent at quality zero.** 2,765 of 7,486 gem rows carry no such
 *    key, and every one of them is a gem in the state it drops in. Read as `undefined`,
 *    the level 1 quality 0 row — the only row an exceptional gem ever has — stops being
 *    a gem anything can price.
 * 2. **`levelRequired` is two different numbers.** On `BaseType`, `Flask` and
 *    `ClusterJewel` it is the item level a price belongs to; on a unique or a gem it is
 *    the level a character needs to equip it. Only the first three read it.
 * 3. **A Vaal transfiguration is spelled with brackets.** poe.ninja writes
 *    `Vaal Cold Snap (Cold Snap of Power)`; the game calls it `Vaal Cold Snap of Power`,
 *    and 119 rows are affected.
 */

/**
 * Listings below which a price is not much evidence of a market.
 *
 * poe.ninja publishes no confidence flag, so this stands in for one. Ten is where
 * PoeWatch's own `lowConfidence` sits in practice on the rows this was compared against,
 * and the number is here rather than in a caller because it is a fact about how thin this
 * feed's tail is, not a policy about what to do with it.
 */
const LOW_CONFIDENCE_COUNT = 10;

/**
 * The footprint every row is given, because poe.ninja publishes none.
 *
 * **The one field here that is invented rather than absent.** A 2×4 body armour and a 1×1
 * orb both come out of this file as one slot. Nothing prices from a footprint — it is
 * shown on the tier board and read by no rule — and there is no second source for it
 * short of a hand-maintained table of every base in the game.
 */
const UNKNOWN_FOOTPRINT = 1;

/** The item, with the roll poe.ninja priced it at in brackets, as PoeWatch spells it. */
const withVariant = (name: string, variant: string | undefined): string =>
  variant === undefined || variant === "" ? name : `${name} (${variant})`;

/**
 * A name with any trailing parenthesised group taken off.
 *
 * Used on the roll half of a `base-roll` name, so a Chronicle comes out as
 * `Chronicle of Atzoatl (Locus of Corruption)` rather than nesting a second bracket
 * inside the first. Nested brackets are not cosmetic: a reader stripping ` (...)` off the
 * end with a bracket-free pattern strips nothing at all from `a (b (c))`.
 */
const withoutTrailingParens = (name: string): string =>
  name.replace(/\s*\([^()]*\)\s*$/, "").trim();

/**
 * The gem the game means, out of the way poe.ninja writes a Vaal transfiguration.
 *
 * `Vaal Cold Snap (Cold Snap of Power)` is `Vaal Cold Snap` plus the transfiguration's
 * own suffix, so the bracket is unpicked from its **last** ` of `, not its first —
 * `Vaal Rain of Arrows (Rain of Arrows of Saturation)` is `Vaal Rain of Arrows of
 * Saturation`, and splitting at the first would produce `Vaal Rain of Arrows of Arrows of
 * Saturation`.
 *
 * A bracketed name this cannot unpick falls back to the plain gem outside the bracket,
 * which is a name the game does have. The bracketed spelling is not.
 */
const gemName = (line: ItemOverviewLine): string => {
  const bracketed = /^(.*) \(([^()]*)\)$/.exec(line.name);
  if (bracketed === null) return line.name;

  const [, outer = line.name, inner = ""] = bracketed;
  const base = line.baseType ?? outer;
  const at = inner.lastIndexOf(" of ");

  return at < 0 ? outer : `${base}${inner.slice(at)}`;
};

/** The name of the item this row prices, spelled the way the game spells it. */
export function itemName(line: ItemOverviewLine, rule: TypeRule): string {
  switch (rule.naming) {
    case "variant":
      return withVariant(line.name, line.variant);
    case "base":
      return line.baseType ?? line.name;
    case "base-roll":
      return line.baseType === undefined
        ? line.name
        : `${line.baseType} (${withoutTrailingParens(line.name)})`;
    case "gem":
      return gemName(line);
    default:
      return line.name;
  }
}

/**
 * The influences on a base, spelled as PoeWatch spells them.
 *
 * poe.ninja writes `Elder/Crusader`; PoeWatch writes `crusader,elder` — lowercase,
 * comma-joined, alphabetical. The two are the same claim and the sorting is what makes
 * them the same *string*, which matters to anything keying on it.
 *
 * Empty on every type but `BaseType`, where `variant` is a roll and not an influence.
 */
export function influencesOf(
  line: ItemOverviewLine,
  rule: TypeRule,
): string {
  if (rule.influence !== true) return "";
  if (line.variant === undefined || line.variant === "") return "";

  return line.variant
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part !== "")
    .sort()
    .join(",");
}

/** The modifier texts, or `null` where the row carries none — PoeWatch's own shape. */
const modifiers = (
  lines: readonly { readonly text: string }[] | undefined,
): readonly string[] | null =>
  lines === undefined || lines.length === 0
    ? null
    : lines.map((modifier) => modifier.text);

/** Linked sockets. `""` is what a row that cannot link carries, and it is zero links. */
const links = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === "") return undefined;

  const count = Number(value);
  return Number.isFinite(count) ? count : undefined;
};

/**
 * One line, mapped.
 *
 * The `type` is passed in rather than read off the line because it is not on the line —
 * it is the question that was asked, and it is the only trustworthy answer to what this
 * row is. See `item-types.ts`.
 */
export function mapItemOverviewLineToNinjaItem(
  line: ItemOverviewLine,
  type: ItemType,
): NinjaItem {
  const rule = TYPE_RULES[type];
  const price = line.chaosValue;
  const spark = line.sparkLine;

  const gem = rule.category === "gem";
  const linkCount = links(line.links);

  return {
    id: line.id,
    name: itemName(line, rule),
    group: groupFor(rule, line.itemType),
    frame: rule.frame,
    influences: influencesOf(line, rule),
    icon: line.icon ?? "",
    // One number, three times over. poe.ninja publishes what it thinks the item is worth
    // and no spread around it, and inventing a range from a single price would be making
    // up the only part of it a reader would find interesting.
    mean: price,
    min: price,
    max: price,
    exalted: line.exaltedValue ?? 0,
    divine: line.divineValue ?? 0,
    // `count` and not `listingCount`: this is the number of listings behind the printed
    // price, which is the relationship PoeWatch's `daily` has to its `mean`.
    // `listingCount` counts everything seen all league — `Map (Tier 16)` reads 623,539 —
    // and says nothing about whether anyone is trading one today. It saturates at 399,
    // which no threshold here is anywhere near.
    daily: line.count,
    change: spark?.totalChange ?? null,
    history:
      spark === undefined
        ? null
        : spark.data.filter((point): point is number => point !== null),
    sevenDaysHistory: spark?.data ?? null,
    lowConfidence: line.count < LOW_CONFIDENCE_COUNT,
    implicits: modifiers(line.implicitModifiers),
    explicits: modifiers(line.explicitModifiers),
    itemLevel: rule.itemLevel === true ? (line.levelRequired ?? null) : null,
    width: UNKNOWN_FOOTPRINT,
    height: UNKNOWN_FOOTPRINT,
    category: rule.category,
    ...(linkCount === undefined ? {} : { linkCount }),
    ...(gem
      ? {
          gemLevel: line.gemLevel ?? 1,
          // The reason this file exists. Absent is zero, and zero is what drops.
          gemQuality: line.gemQuality ?? 0,
          gemIsCorrupted: line.corrupted ?? false,
        }
      : {}),
    // Never a number. poe.ninja publishes no map tier; a map's name carries it, as
    // `Map (Tier 16)`, and reading it out of the name would be this package inventing a
    // field rather than reporting one.
    ...(rule.category === "maps" ? { mapTier: null } : {}),
    ninjaType: type,
  };
}
