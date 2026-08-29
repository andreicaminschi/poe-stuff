/** A `min`/`max` pair. RePoE gives every defence as a roll range, never a single number. */
export type DefenceRange = {
  min: number;
  max: number;
};

/** The level and attributes an item asks for. `null` on the 4,614 rows that ask nothing. */
export type BaseItemRequirements = {
  level: number;
  strength: number;
  dexterity: number;
  intelligence: number;
};

/**
 * Every property RePoE knows how to fill in, for every kind of base at once.
 *
 * **Each key is present on every row and null on most of them.** A flask carries no
 * `attack_time` and a wand carries no `charges_max`, but both objects have both keys. The
 * item's own `item_class` and `tags` are what say which ones mean anything.
 */
export type BaseItemProperties = {
  armour: DefenceRange | null;
  energy_shield: DefenceRange | null;
  evasion: DefenceRange | null;
  ward: DefenceRange | null;
  block: number | null;
  movement_speed: number | null;
  description: string | null;
  directions: string | null;
  stack_size: number | null;
  stack_size_currency_tab: number | null;
  /** Metadata id of what a full stack becomes. Set on the shards, null everywhere else. */
  full_stack_turns_into: string | null;
  charges_max: number | null;
  charges_per_use: number | null;
  duration: number | null;
  life_per_use: number | null;
  mana_per_use: number | null;
  attack_time: number | null;
  critical_strike_chance: number | null;
  physical_damage_min: number | null;
  physical_damage_max: number | null;
  range: number | null;
  mana_burn_ms: number | null;
  cooldown_ms: number | null;
  monster_id: string | null;
  monster_ability_text: string | null;
  monster_category: string | null;
};

/** The art the client draws for an item. */
export type BaseItemVisualIdentity = {
  /** Path into the game's art bundle, e.g. `Art/2DItems/Currency/CurrencyRerollRare.dds`. */
  dds_file: string;
  id: string;
};

/** The buff a utility flask grants while it is up. Stat ids are GGG's internal names. */
export type BaseItemBuff = {
  id: string;
  stats: Record<string, number>;
};

/** One base item, as RePoE exports it. */
export type BaseItem = {
  /**
   * Which game system the item belongs to: `item`, `flask`, `abyss_jewel`, `misc`,
   * `undefined` and eighteen more. A string rather than a union — RePoE adds one every
   * league and a union here would reject the new file.
   */
  domain: string;
  /** Lowest area level the item can drop at. 1 for anything with no restriction. */
  drop_level: number;
  /** Mod ids of the implicits the base always rolls. Empty for most items. */
  implicits: readonly string[];
  inventory_width: number;
  inventory_height: number;
  /** Metadata id of the parent this base derives from. */
  inherits_from: string;
  /**
   * GGG's internal class name — `StackableCurrency`, `Wand`, `Body Armour`. **Not the
   * `Class` a `.filter` matches on**, which is the display name the client shows.
   */
  item_class: string;
  /** The name the client shows. Not unique: several metadata ids share one name. */
  name: string;
  properties: BaseItemProperties;
  /** `released`, `unreleased`, `legacy`, or `unique_only`. */
  release_state: string;
  /** Internal tags the mod pools roll against, e.g. `currency`, `two_hand_weapon`. */
  tags: readonly string[];
  visual_identity: BaseItemVisualIdentity;
  requirements: BaseItemRequirements | null;
  grants_buff: BaseItemBuff | null;
  /** Null on every row of the export. RePoE exports the key and fills nothing. */
  skills_granted: null;
};

/**
 * The whole `base_items.json` file: one entry per base, keyed by metadata id such as
 * `Metadata/Items/Currency/CurrencyRerollRare`. There is no envelope — the file is the
 * record.
 */
export type BaseItems = Record<string, BaseItem>;
