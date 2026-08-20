/**
 * One row as Cargo returns it: the wiki's own column names, and booleans as 0 or 1.
 *
 * Every value arrives HTML-escaped, because these columns are rendered into pages before
 * they are ever exported — `Abberath&#039;s Hooves` is what comes off the wire.
 */
export type CargoUniqueRow = {
  readonly name: string;
  readonly base_type: string;
  readonly category: string;
  readonly restricted_drop: number;
};

/**
 * One unique, as this package hands it out.
 *
 * `category` is the wiki's display class — `Ring`, `Amulet`, `Body Armour`,
 * `Two-Handed Sword` — not the internal id, which spells the same things `AtlasRelic`
 * and `UtilityFlask`.
 *
 * `restrictedDrop` is the wiki's editorial judgement, not something GGG publishes: true
 * for anything that cannot drop from the general pool — league-only, boss-only,
 * vendor-recipe, prophecy. It exists nowhere in GGG's own data, which is the reason to
 * come here for it at all.
 */
export type WikiUniqueItem = {
  readonly name: string;
  readonly baseType: string;
  readonly category: string;
  readonly restrictedDrop: boolean;
};

/** The six influences, by the names the game shows. */
export type Influence =
  | "Shaper"
  | "Elder"
  | "Crusader"
  | "Redeemer"
  | "Hunter"
  | "Warlord";

/**
 * One row of the `mods` / `mod_spawn_weights` join, as Cargo returns it.
 *
 * `weight` is a number in every payload seen, but the column is declared String — which
 * is why it is only ever compared in TypeScript. A `where` clause that treats it as a
 * number returns no rows and no error.
 */
export type CargoInfluenceModRow = {
  readonly id: string;
  /** Null for the modifiers that carry no affix name. */
  readonly name: string | null;
  readonly stat_text: string;
  readonly mod_groups: readonly string[];
  readonly required_level: number;
  readonly tag: string;
  readonly weight: number;
};

/**
 * One modifier, on one equipment slot, from one influence.
 *
 * The grain is deliberate: a modifier that rolls on eight slots is eight rows, because
 * the weight and the slot are what a filter cares about, not the mod in the abstract.
 *
 * `weight` of 0 means the modifier is attached to the slot but cannot roll there
 * naturally — the Elevated variants Maven crafting produces are the common case. They
 * are returned rather than dropped: which of them matter is the caller's decision.
 */
export type InfluenceMod = {
  readonly influence: Influence;
  /** The wiki's own tag prefix: `helmet`, `2h_sword`, `rune_dagger`. */
  readonly equipmentSlot: string;
  /** Internal mod id, unique per modifier and stable across leagues. */
  readonly id: string;
  /**
   * The affix as it reads on an item: `of Shaping`, `Tempered`. Null where the wiki
   * records none — mostly the crafted-only variants, which is also where the
   * weight-0 rows are.
   */
  readonly name: string | null;
  /** The rolled text, markup stripped. Hybrid modifiers keep their newline. */
  readonly modifier: string;
  /**
   * Modifiers sharing a group are mutually exclusive on one item. A list because the
   * wiki declares the column as one — in practice it holds a single group.
   */
  readonly modGroups: readonly string[];
  readonly requiredLevel: number;
  readonly weight: number;
};

/**
 * One row of the corrupted-mod join, as Cargo returns it.
 *
 * `tag` and `weight` are nullable because Cargo left-joins: a mod carrying no spawn
 * weight anywhere still comes back, with nothing on the right-hand side.
 */
export type CargoCorruptedModRow = {
  readonly id: string;
  readonly stat_text: string | null;
  readonly mod_groups: readonly string[];
  readonly required_level: number;
  readonly domain: number;
  readonly tag: string | null;
  readonly weight: number | null;
};

/**
 * One corrupted modifier, on one item class.
 *
 * This is the pool a Vaal Orb draws an implicit from, and how that draw is weighted. It
 * is not the odds of the orb doing that rather than one of the other things it does —
 * that split lives nowhere in Cargo, and assembling it is a model of the game rather
 * than a reading of a table.
 *
 * A weight of 0 means the modifier is attached to the class but cannot be drawn there.
 * Returned rather than dropped, as with `InfluenceMod` — which zeros matter is the
 * caller's decision.
 */
export type CorruptedMod = {
  readonly id: string;
  /**
   * The rolled text, markup stripped. Hybrid modifiers keep their newline.
   *
   * Null where the wiki records none, which is the map and watchstone corruptions —
   * they scale a modifier the map already has rather than adding a line of their own.
   * Thirteen rows, all with real weights.
   */
  readonly modifier: string | null;
  /** The wiki's own tag: `ring`, `body_armour`, `jewel`, `infected_map`. */
  readonly itemClass: string;
  readonly weight: number;
  readonly requiredLevel: number;
  readonly modGroups: readonly string[];
  /**
   * The game's numeric mod domain. 1 is an item, 10 a jewel, 13 an abyss jewel; 5, 25,
   * 32, 38 and 7 also appear. Passed through as the number the wiki exports — there is
   * no name for these in the Cargo tables, and inventing one here would be a guess.
   */
  readonly domain: number;
};

/**
 * One row of the `skill_gems` / `items` join, as Cargo returns it.
 *
 * `support_gem_letter` is declared a String column but arrives as a number whenever the
 * letter is a digit — `8` for Cooldown Recovery Support — so it is widened here rather
 * than trusted.
 */
export type CargoExceptionalGemRow = {
  readonly name: string;
  readonly class: string;
  readonly gem_tags: readonly string[];
  readonly skill_id: string;
  readonly max_level: number;
  readonly drop_level: number;
  readonly required_level: number;
  readonly restricted: number;
  readonly support_gem_letter: string | number | null;
  readonly primary_attribute: string;
};

/**
 * One gem carrying the `Exceptional` gem tag.
 *
 * The tag is the game's own, not the wiki's editorial grouping, and it covers more than
 * the three gems the name suggests: Enlighten, Empower and Enhance and their Awakened
 * forms, every Greater support, the Pact skill gems, and the rest of the level-72
 * drop-restricted supports.
 *
 * There is nothing in GGG's data to read this off — `/data/items` publishes no gem tags
 * — which is why it comes from here.
 */
export type ExceptionalGem = {
  readonly name: string;
  /** The wiki's display class: `Support Gem` or `Skill Gem`. */
  readonly itemClass: string;
  /** Every gem tag, `Exceptional` among them, in the order the wiki lists them. */
  readonly gemTags: readonly string[];
  /** Internal skill id, stable across leagues: `SupportAwakenedEmpower`. */
  readonly skillId: string;
  readonly maxLevel: number;
  readonly dropLevel: number;
  readonly requiredLevel: number;
  /** True for anything outside the general drop pool, as the wiki judges it. */
  readonly restrictedDrop: boolean;
  /**
   * The glyph the game prints on a support gem's socket. Null on skill gems, which have
   * none.
   */
  readonly supportGemLetter: string | null;
  /** `strength`, `dexterity`, `intelligence`, or `none` for the gems tied to neither. */
  readonly primaryAttribute: string;
};

/**
 * One row of the transfigured-gem query, exactly as Cargo sends it.
 *
 * `base_item` is the whole discriminator, which is why the row is two columns wide.
 */
export type CargoTransfiguredGemRow = {
  readonly name: string;
  readonly base_item: string;
};

/**
 * One transfigured gem — an alternate version of a base skill gem, cut from a Divine Font
 * in the Labyrinth.
 *
 * Nothing in the item's own data marks it as transfigured. What marks it is `base_item`
 * pointing back at the gem it was cut from: among gems that column is set on the 214
 * transfigured ones and null on every other. Matching the `" of "` in the name instead
 * would also catch Herald of Ash, Wave of Conviction and 25 more base gems.
 */
export type TransfiguredGem = {
  readonly name: string;
  /** The base skill gem this one is a transfiguration of: `Ethereal Knives`. */
  readonly baseItem: string;
};
