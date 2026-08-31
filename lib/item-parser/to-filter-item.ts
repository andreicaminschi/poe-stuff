/**
 * A parsed item, as a filter sees it.
 *
 * This is the one file in the package that writes words down. Everywhere else a list would
 * go stale the moment GGG adds something; here it cannot, because the words are the filter
 * language's own and `docs/item-filter-syntax.md` is what fixes them. `CONDITIONS` in
 * `@poe/filter-eval/filter-ast` already holds the closed ones — the influences come from
 * there rather than being spelled out again.
 *
 * `FilterItem` fills its defaults rather than leaving keys off: the evaluator reads a
 * missing key as a real gap and fails the condition, so `Quality` is `0` on an item that
 * never had any and `Corrupted` is `false` on one that is not.
 *
 * Some conditions no item text can answer, and they stay absent on purpose:
 *
 * - `AreaLevel` is where the item dropped, not what it is. The caller knows it; the item
 *   never says.
 * - `Width`, `Height`, `DropLevel`, `BaseArmour`, `BaseEvasion`, `BaseEnergyShield`,
 *   `BaseWard` and `BaseDefencePercentile` are properties of the base type, which live in
 *   GGG's item data rather than on the item.
 * - `HasEaterOfWorldsImplicit` and `HasSearingExarchImplicit` want the implicit's tier as a
 *   number. Nothing in the sample items shows how the game prints it, and guessing a
 *   wording would be this file inventing one.
 * - `GemLevel`, `GemQualityType`, `TransfiguredGem` need a gem, and there is no gem among
 *   the samples to read the wording off.
 */

import { CONDITIONS, type FilterItem } from "@poe/filter-eval/filter-ast";
import { property } from "./parse-item.ts";
import type { ParsedItem } from "./types.ts";

/** The rarities a filter compares. Everything else the game prints is `Normal` to a filter. */
const RARITIES: ReadonlySet<string> = new Set(CONDITIONS.Rarity.order);

/** What a filter sees when the game printed something outside that ladder. */
type Rarity = (typeof CONDITIONS.Rarity.order)[number];

const rarityOf = (rarity: string): Rarity =>
  RARITIES.has(rarity) ? (rarity as Rarity) : "Normal";

/** The six influences, minus the `None` that only a filter line writes. */
const INFLUENCES = CONDITIONS.HasInfluence.values.filter((value) => value !== "None");

/** The tier a map carries in its name when there is no `Map Tier:` property. */
const NAME_TIER = /\(Tier (\d+)\)/;

/** The word a replica unique opens its name with. */
const REPLICA = "Replica ";

/** What the game prefixes a blighted map's base type with, and its uber form. */
const BLIGHTED = "Blighted ";
const UBER_BLIGHTED = "Blight-ravaged ";

/** The first number of a property, or the fallback when the item has no such property. */
const number = (item: ParsedItem, name: string, fallback: number) =>
  property(item, name)?.numbers[0] ?? fallback;

/** Whether a header's qualifiers include a word, ignoring the case the game wrote it in. */
const qualifiedMod = (qualifiers: readonly string[], word: string) =>
  qualifiers.some((found) => found.toLowerCase() === word);

/** Whether any modifier's header carries this word. */
const qualified = (item: ParsedItem, word: string) =>
  item.mods.some((mod) => qualifiedMod(mod.header.qualifiers, word));

/**
 * The map's tier, from the property if it has one and from its name if it does not.
 *
 * The game prints `Map Tier: 16` on an ordinary map and folds the tier into the name of a
 * blighted one — `Blighted Map (Tier 16)` — so both are read.
 */
function mapTier(item: ParsedItem): number | undefined {
  const tier = property(item, "Map Tier")?.numbers[0];
  if (tier !== undefined) return tier;

  const named = NAME_TIER.exec(item.baseType)?.[1];
  return named === undefined ? undefined : Number(named);
}

export function toFilterItem(item: ParsedItem): FilterItem {
  const influences = INFLUENCES.filter((name) => item.flags.includes(`${name} Item`));
  const tier = mapTier(item);

  const enchantments = item.mods
    .filter((mod) => qualifiedMod(mod.header.qualifiers, "enchant"))
    .map((mod) => mod.lines.map((line) => line.text).join("\n"));

  // A filter's `HasExplicitMod` matches the affix name — `"Tyrannical"` — which is exactly
  // what the header quotes, and the only place on the item it is written.
  const explicitNames = item.mods
    .filter((mod) => mod.header.affix === "prefix" || mod.header.affix === "suffix")
    .map((mod) => mod.header.name)
    .filter((name) => name !== "");

  const largestGroup = Math.max(0, ...item.sockets.map((group) => group.length));

  return {
    Class: item.itemClass,
    BaseType: item.baseType,
    Rarity: rarityOf(item.rarity),

    ItemLevel: number(item, "Item Level", 0),
    Quality: number(item, "Quality", 0),
    StackSize: number(item, "Stack Size", 1),
    ...(tier === undefined ? {} : { MapTier: tier }),

    // `Sockets` reads every letter and `SocketGroup` tries one group at a time, so both take
    // the same string and the spaces are what tell them apart.
    Sockets: item.sockets.join(" "),
    SocketGroup: item.sockets.join(" "),
    // One socket is not a link, which is why the game and the filter both call it zero.
    LinkedSockets: largestGroup > 1 ? largestGroup : 0,

    Corrupted: item.flags.includes("Corrupted"),
    Mirrored: item.flags.includes("Mirrored"),
    Identified: !item.flags.includes("Unidentified"),
    FracturedItem: item.flags.includes("Fractured Item") || qualified(item, "fractured"),
    SynthesisedItem: item.flags.includes("Synthesised Item") || qualified(item, "synthesised"),
    Scourged: qualified(item, "scourge"),
    Replica: item.name.startsWith(REPLICA),

    ShaperItem: influences.includes("Shaper"),
    ElderItem: influences.includes("Elder"),
    HasInfluence: influences,

    HasImplicitMod: item.mods.some((mod) => mod.header.affix === "implicit"),
    CorruptedMods: item.mods.filter((mod) => qualifiedMod(mod.header.qualifiers, "corruption")).length,
    AnyEnchantment: enchantments.length > 0,
    HasEnchantment: enchantments,
    HasExplicitMod: explicitNames,

    BlightedMap: item.baseType.startsWith(BLIGHTED),
    UberBlightedMap: item.baseType.startsWith(UBER_BLIGHTED),
  };
}
