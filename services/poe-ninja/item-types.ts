import type { ItemType } from "./get-item-overview.types.ts";

/**
 * What each item `type` actually is, decided by the endpoint that was asked rather than
 * by anything in the payload.
 *
 * **This table exists because `itemClass` cannot be read.** poe.ninja documents it as a
 * rarity — 0 normal, 1 magic, 2 rare, 3 unique — and the payload does not honour that:
 *
 * - `type=BaseType` returns 20,004 white crafting bases and ~95% of them carry `2`. Read
 *   as a rarity, every crafting base in the game would be a rare and the whole family
 *   would vanish.
 * - `type=UniqueAccessory` carries `3` on 357 rows and `10` on eight — Nimis,
 *   Stranglegasp, Precursor's Emblem, Ynda's Stand — which are ordinary uniques. Read as
 *   a rarity, those eight are an unknown kind of item.
 * - `type=ValdoMap` is `10` on every row; `type=Beast` is `2` and `3` on rows that are
 *   neither rare nor unique in any sense the filter cares about.
 *
 * The `type` has none of that ambiguity: a row from `UniqueArmour` is a unique piece of
 * armour because that is the question that was asked. So `frame`, `category` and `group`
 * are read from here and `itemClass` is dropped on the floor.
 *
 * The `category` words are PoeWatch's, and deliberately: a filter reading a market has
 * one vocabulary for what a row is, and inventing a second one here would make the two
 * feeds disagree about a question neither of them is really answering. Each row below was
 * checked against a full PoeWatch dump of the same league — a Wombgift really is filed
 * under `chayula`, a Chronicle under `maps`, a Scrying Orb under `currency`.
 */
export type TypeRule = {
  /** 0 normal, 1 magic, 2 rare, 3 unique, 4 gem, 5 currency, 6 divination card. */
  readonly frame: number;
  readonly category: string;
  /**
   * The sub-group, where the whole type is one. `null` means take it from the row's own
   * `itemType`, which is what the equipment types carry.
   */
  readonly group: string | null;
  /** How the row's name is built. See `NAMING` for what each word does. */
  readonly naming: Naming;
  /** Whether `levelRequired` on this type is an item level rather than a requirement. */
  readonly itemLevel?: true;
  /** Whether `variant` on this type is an influence rather than a roll. */
  readonly influence?: true;
};

/**
 * How a row's name is built, because poe.ninja does not always put the item in `name`.
 *
 * - `plain` — the name is the item. Most types.
 * - `variant` — the item plus the roll it was priced at, as `Name (variant)`. This is
 *   exactly how PoeWatch spells a unique: `Foulborn Headhunter (Culling, Minimap Icons)`.
 * - `base` — the item is in `baseType` and `name` is a label the game does not print on
 *   the ground. A conqueror map is a `Vaal Temple Map`; a cluster jewel is a
 *   `Large Cluster Jewel` and its `name` is the enchantment rolled on it.
 * - `base-roll` — the item is in `baseType` and `name` is the roll, so the two are put
 *   back together the way PoeWatch writes them: `Scrying Orb (Vaal Pyramid)`,
 *   `Chronicle of Atzoatl (Locus of Corruption)`.
 * - `gem` — plain, except for the 119 rows poe.ninja writes as
 *   `Vaal Cold Snap (Cold Snap of Power)`. The game calls that gem
 *   `Vaal Cold Snap of Power`, and a filter looking up the bracketed spelling finds
 *   nothing.
 */
export type Naming = "plain" | "variant" | "base" | "base-roll" | "gem";

/** Equipment groups come off the row's own `itemType`; everything else is fixed here. */
const FROM_ITEM_TYPE = null;

export const TYPE_RULES: Readonly<Record<ItemType, TypeRule>> = {
  // Crafting bases: one row per base, item level and influence. The two fields the rest
  // of the feed does not have, and the only type where `levelRequired` is an item level
  // and `variant` is an influence.
  BaseType: {
    frame: 0,
    category: "bases",
    group: FROM_ITEM_TYPE,
    naming: "plain",
    itemLevel: true,
    influence: true,
  },
  // Base flasks, priced by item level exactly as the bases are. `Iron Flask` at 85 is a
  // crafting base, not a unique.
  Flask: {
    frame: 0,
    category: "bases",
    group: "flasks",
    naming: "plain",
    itemLevel: true,
  },
  // The jewel is the item; `name` is the enchantment it rolled and `levelRequired` is the
  // level that enchantment needs, which is the closest thing to an item level a cluster
  // jewel has. PoeWatch files these under `bases/jewels` at ilvl 84–86.
  ClusterJewel: {
    frame: 0,
    category: "bases",
    group: "jewels",
    naming: "base",
    itemLevel: true,
  },

  UniqueWeapon: {
    frame: 3,
    category: "weapons",
    group: FROM_ITEM_TYPE,
    naming: "variant",
  },
  UniqueArmour: {
    frame: 3,
    category: "armour",
    group: FROM_ITEM_TYPE,
    naming: "variant",
  },
  UniqueAccessory: {
    frame: 3,
    category: "accessories",
    group: FROM_ITEM_TYPE,
    naming: "variant",
  },
  UniqueFlask: { frame: 3, category: "flasks", group: "flasks", naming: "variant" },
  UniqueJewel: { frame: 3, category: "jewels", group: "jewels", naming: "variant" },
  // Forbidden Flesh and Forbidden Flame: unique cobalt jewels whose `variant` says which
  // half of the pair this is.
  ForbiddenJewel: { frame: 3, category: "jewels", group: "jewels", naming: "variant" },
  // Empty in the league this was built against. A shrine belt is a unique belt, and
  // PoeWatch files every unique belt under `accessories/belts`.
  ShrineBelt: { frame: 3, category: "accessories", group: "belts", naming: "variant" },
  UniqueTincture: { frame: 3, category: "azmeri", group: "azmeri", naming: "variant" },
  UniqueRelic: { frame: 3, category: "sanctum", group: "relic", naming: "variant" },

  SkillGem: { frame: 4, category: "gem", group: "gems", naming: "gem" },
  // Empty in the league this was built against. An imbued gem is a gem.
  ImbuedGem: { frame: 4, category: "gem", group: "gems", naming: "gem" },

  // Maps of every rarity. `frame` is `0` for all of them rather than `itemClass`'s
  // 0/1/2 — the number is the rarity of whichever listing was sampled, and a map's
  // rarity is not what a filter reads a map by.
  Map: { frame: 0, category: "maps", group: "maps", naming: "base" },
  BlightedMap: { frame: 0, category: "maps", group: "maps", naming: "plain" },
  BlightRavagedMap: { frame: 0, category: "maps", group: "maps", naming: "plain" },
  UniqueMap: { frame: 3, category: "maps", group: "unique", naming: "plain" },
  // Valdo's puzzle boxes. PoeWatch prices none of them, so this row is this package's own
  // reading: the item is the `Valdo Map` in `baseType` and the `name` is the reward it
  // pays out, which is a roll the way a Scrying Orb's region is.
  ValdoMap: { frame: 0, category: "maps", group: "maps", naming: "base-roll" },
  // PoeWatch files Invitations, Reliquary Keys and the Chronicles under `maps` for where
  // they are used rather than for what they are. Followed here, exactly.
  Invitation: { frame: 0, category: "maps", group: "maps", naming: "plain" },
  IncursionTemple: {
    frame: 5,
    category: "maps",
    group: "currency",
    naming: "base-roll",
  },
  // Empty in the league this was built against. PoeWatch prices `Memory of Trauma` under
  // `currency`, which is the only evidence available for where these belong.
  Memory: { frame: 5, category: "currency", group: "currency", naming: "plain" },

  ScryingOrb: { frame: 5, category: "currency", group: "currency", naming: "base-roll" },
  Vial: { frame: 5, category: "currency", group: "currency", naming: "plain" },
  Wombgift: { frame: 5, category: "chayula", group: "currency", naming: "plain" },
  Corpse: {
    frame: 5,
    category: "itemisedcorpses",
    group: "currency",
    naming: "plain",
  },
  // Empty in the league this was built against, and the one row here with no PoeWatch
  // evidence behind it at all — nothing in the dump is an incubator.
  Incubator: { frame: 5, category: "currency", group: "currency", naming: "plain" },
  // Itemised beasts. Frame 2 because that is what PoeWatch carries on 218 of its 224
  // beast rows, and because nothing about a captured beast is a floor drop anyway.
  Beast: { frame: 2, category: "monsters", group: "beast", naming: "plain" },
};

/**
 * The group for one row: the type's own, or the equipment slot the row names.
 *
 * Spaces come out and the case goes down, so `Body Armour` files as `bodyarmour`. It is
 * not PoeWatch's exact spelling — that one pluralises, inconsistently — and nothing reads
 * this field to decide anything. It is here so a row can be grouped by eye.
 */
export const groupFor = (
  rule: TypeRule,
  itemType: string | undefined,
): string | null => {
  if (rule.group !== FROM_ITEM_TYPE) return rule.group;
  if (itemType === undefined || itemType === "") return null;

  return itemType.toLowerCase().replaceAll(" ", "");
};
