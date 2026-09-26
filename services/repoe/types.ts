/** A response worth keeping, in the only form that survives being written down. */
export type CachedResponse = {
  url: string;
  status: number;
  body: unknown;
  storedAt: string;
};

/**
 * Somewhere previous answers live. `call` holds one of these as an interface it was handed,
 * so it stays ignorant of files, buckets and clients.
 *
 * Structurally identical to the one `@poe/ggg` and `@poe/poe-watch` declare, on purpose
 * rather than by accident: one `fileCache<CachedResponse>(root)` from
 * `@util/cache/file-cache` satisfies every service in the repo, and no service has to import
 * another to say so.
 */
export type ResponseCache = {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse): Promise<void>;
};

/**
 * What every endpoint in this package needs from the process it runs in.
 *
 * The URL and the user agent are here rather than read from the environment, because a
 * service is configured by whoever builds it. Nothing in this package reads `process.env`,
 * so it runs with no `.env` at all.
 *
 * Passed as one object so that a new concern is a new field rather than a fourth
 * positional argument at every call site.
 */
export type RepoeContext = {
  /** Base of the RePoE site, without a trailing slash. */
  baseUrl: string;
  /** Sent on every request. */
  userAgent: string;
  /**
   * Absent by default. Its presence is the only thing that turns caching on — and
   * `base_items.json` is the whole export on every call, so a laptop wants it.
   */
  cache?: ResponseCache;
};

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
 * One passive a cluster jewel can be enchanted with: the enchant the item carries, and the
 * name that passive has on the tree.
 *
 * `stat_text` is the mod text, one line per stat, exactly as the client shows it — and
 * exactly as PoeWatch writes it into a listing's name. `name` is what a `.filter` asks for
 * with `EnchantmentPassiveNode`. Pairing the two is the whole reason the file is read.
 */
export type ClusterJewelPassive = {
  /** `affliction_axe_and_sword_damage`. Unique within a size. */
  id: string;
  /** `Axe and Sword Damage`. What `EnchantmentPassiveNode` matches. */
  name: string;
  /** Stat id to value. */
  stats: Record<string, number>;
  /**
   * One line per stat, as the client shows it. A two-line enchant is two entries, and the
   * order is not PoeWatch's: it writes `Staff` before `Mace or Sceptre`, this file the other
   * way round. Compare as a set.
   */
  stat_text: string[];
  /** The same as `id` on every row seen. */
  tag: string;
};

/** One size of cluster jewel, as RePoE exports it. */
export type ClusterJewel = {
  /** `Large Cluster Jewel`. */
  name: string;
  /** `Large`, `Medium` or `Small`. */
  size: string;
  /** How many passives the jewel adds, as its "Adds # Passive Skills" mod may roll. */
  min_skills: number;
  max_skills: number;
  /** Positions on the jewel's own subgraph, by role. */
  notable_indices: number[];
  small_indices: number[];
  socket_indices: number[];
  total_indices: number;
  /** Every enchant this size can roll. */
  passive_skills: ClusterJewelPassive[];
};

/**
 * The mod an essence forces, per equipment slot it can be used on.
 *
 * The same slots are on every row — `Amulet`, `Belt`, `Body Armour`, `Boots`, `Bow`,
 * `Claw`, `Dagger`, `Gloves`, `Helmet`, `One Handed Axe`, `One Handed Mace`,
 * `One Handed Sword`, `Quiver`, `Ring`, `Sceptre`, `Shield`, `Staff`,
 * `Thrusting One Handed Sword`, `Two Handed Axe`, `Two Handed Mace`, `Two Handed Sword`
 * and `Wand`.
 *
 * A `Record` rather than a union of those names: a new slot is a data change, and a union
 * here would reject the new file.
 */
export type EssenceMods = Record<string, string>;

/** One essence, as RePoE exports it. */
export type Essence = {
  /** The name the client shows, e.g. `Muttering Essence of Anger`. Unique across the file. */
  name: string;
  /**
   * How strong the essence is, 1 to 8. 1 is `Whispering` and 7 is `Deafening`; 8 is the
   * corrupted-only set — Horror, Delirium, Hysteria and Insanity.
   *
   * **Not the number on the end of the metadata id**, which counts within a family and
   * starts at 1 wherever that family's lowest tier happens to be.
   */
  tier: number;
  /**
   * Which essence this is, as an index into the family list: Hatred, Woe, Greed and the
   * rest. A number, not a name — read `name` for anything a person will see.
   */
  type: number;
  mods: EssenceMods;
};

/**
 * The tags a gem carries, as a set written down as an object.
 *
 * **A tag it does not have is absent, never `false`.** Every value in here is `true`, so
 * `tags.support` reads as a boolean check and `Object.keys(tags)` is the list.
 *
 * A `Record` rather than a union of the tag names: GGG adds one every league and a union
 * here would reject the new file.
 */
export type GemTags = Record<string, true>;

/** One gem variant, as RePoE exports it. */
export type Gem = {
  /**
   * Metadata id of the **base** gem this row is a variant of. Not unique — a transfigured
   * variant and its parent carry the same one, which is what says they are the same gem.
   */
  gameId: string;
  /** Id of this variant. The record's key, in every ordinary case. */
  variantId: string;
  /** Id of the effect the gem grants. Equal to `variantId` except for casing on a few rows. */
  grantedEffectId: string;
  /** The name the client shows. Unique across the file. */
  name: string;
  /**
   * The item base the gem drops as. **Absent on every support gem** — a support's base type
   * is not written down here, only its `name`.
   */
  baseTypeName?: string;
  /** Highest level the gem reaches without help. 20 for most, lower for the utility skills. */
  naturalMaxLevel: number;
  /**
   * How the gem's level requirement splits across the attributes, as a weighting that
   * normally sums to 100. **Not a requirement in points** — a pure strength gem is
   * `reqStr: 100`, not `reqStr: 111`.
   */
  reqStr: number;
  reqDex: number;
  reqInt: number;
  /** The tag line the client prints under the name, comma separated. */
  tagString: string;
  tags: GemTags;
  /** Display name of a second effect the gem grants. Set on a handful of rows. */
  secondaryEffectName?: string;
  /** Id of that second effect. Set on more rows than `secondaryEffectName` is. */
  secondaryGrantedEffectId?: string;
  /** Present and `true` on Vaal gems. Absent everywhere else — never `false`. */
  vaalGem?: true;
};

/**
 * One modifier on a spectre, as RePoE exports it.
 *
 * **Passed through untouched.** Nothing in this package interprets it, and the
 * numeric-string keys — `"1"`, `"2"` — hold the conditions and multipliers that gate the
 * mod, which is why the index signature is here at all.
 *
 * The shape is recursive: a `LIST` mod's `value` is `{ mod }`, holding the modifier it
 * grants to the player, an ally or a minion.
 */
export type SpectreMod = {
  /** What the mod affects, e.g. `PhysicalDamage`, `SpellBlockChance`, `AllyModifier`. */
  name: string;
  /** How it applies: `BASE`, `INC`, `MORE`, `LIST`, `FLAG`, `OVERRIDE` or `MAX`. */
  type: string;
  /** Damage-type and skill-type bitfield. */
  flags: number;
  keywordFlags: number;
  value: number | boolean | { mod: SpectreMod };
  /** The numeric-string keys, each a condition or multiplier gating the mod. */
  [condition: string]: unknown;
};

/**
 * One spectre, as RePoE exports it.
 *
 * **The stats are multipliers against the monster base table, not absolute numbers.**
 * `life: 4.4` is 4.4 times a monster of that level, not 4.4 life. The resistances are the
 * exception and are plain percentages.
 */
export type Spectre = {
  /** The name the client shows. **Not unique** — several metadata ids share one. */
  name: string;
  life: number;
  damage: number;
  /** How far either side of `damage` the rolls spread, as a fraction. */
  damageSpread: number;
  accuracy: number;
  attackTime: number;
  attackRange: number;
  fireResist: number;
  coldResist: number;
  lightningResist: number;
  chaosResist: number;
  /** Internal tags the monster carries, e.g. `undead`, `caster`, `flesh_armour`. */
  monsterTags: readonly string[];
  /** Ids of the skills the spectre uses. `Melee` is the plain attack. */
  skillList: readonly string[];
  /** Usually empty. */
  modList: readonly SpectreMod[];
  /** **Absent rather than zero** when the monster has none of that defence. */
  armour?: number;
  evasion?: number;
  energyShield?: number;
  /** The weapon the monster attacks with, e.g. `Bow`, `Staff`, `None`. */
  weaponType1?: string;
  /** The off-hand. Never present without `weaponType1`. */
  weaponType2?: string;
  /** Present and `true` where it applies. Absent everywhere else — never `false`. */
  baseDamageIgnoresAttackSpeed?: true;
  /** `AltLife1` or `AltLife2`: which alternate life table the monster scales on. */
  lifeScaling?: string;
  /** A damage correction applied to a few rows. */
  damageFixup?: number;
};

/** One tag and the weight it gives. The first tag the base carries decides. */
export type ModWeight = {
  tag: string;
  weight: number;
};

/** One stat a mod rolls, with its range. */
export type ModStat = {
  id: string;
  min: number;
  max: number;
};

/** A skill a mod grants, such as a trigger. */
export type ModGrantedEffect = {
  granted_effect_id: string;
  level: number;
};

/**
 * One mod, as `mods.json` records it.
 *
 * **Whether it rolls on a base** is `spawn_weights` read in order: the first entry whose
 * tag the base carries wins, and a weight of zero means never. `domain` has to match the
 * base's too. `required_level` is the lowest item level it rolls at.
 */
export type Mod = {
  name: string;
  /** Where the mod applies, e.g. `item`, `flask`, `abyss_jewel`, `crafted`. */
  domain: string;
  /** e.g. `prefix`, `suffix`, `unique`, `corrupted`, `essence`. */
  generation_type: string;
  required_level: number;
  spawn_weights: readonly ModWeight[];
  /** Multipliers on top of `spawn_weights`, keyed the same way. */
  generation_weights: readonly ModWeight[];
  stats: readonly ModStat[];
  grants_effects: readonly ModGrantedEffect[];
  /** Mods sharing a group cannot roll together. */
  groups: readonly string[];
  /** Tags the mod gives the item once rolled. */
  adds_tags: readonly string[];
  implicit_tags: readonly string[];
  is_essence_only: boolean;
  /** The text the client shows. Null for mods that show none. */
  text: string | null;
  type: string;
  /** Null on every row today. */
  gold_value: number | null;
};
