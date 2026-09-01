/**
 * One modifier on a spectre, in Path of Building's own mod shape.
 *
 * **This is PoB's internal format, passed through untouched.** Nothing in this package
 * interprets it, and the numeric-string keys — `"1"`, `"2"` — hold the conditions and
 * multipliers that gate the mod, which is why the index signature is here at all.
 *
 * The shape is recursive: a `LIST` mod's `value` is `{ mod }`, holding the modifier it
 * grants to the player, an ally or a minion.
 */
export type SpectreMod = {
  /** What the mod affects, e.g. `PhysicalDamage`, `SpellBlockChance`, `AllyModifier`. */
  name: string;
  /** How it applies: `BASE`, `INC`, `MORE`, `LIST`, `FLAG`, `OVERRIDE` or `MAX`. */
  type: string;
  /** PoB's damage-type and skill-type bitfield. */
  flags: number;
  keywordFlags: number;
  value: number | boolean | { mod: SpectreMod };
  /** The numeric-string keys, each a condition or multiplier PoB reads. */
  [condition: string]: unknown;
};

/**
 * One spectre, as Path of Building's table describes it.
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
  /** A damage correction PoB applies to a few rows. */
  damageFixup?: number;
};

/**
 * The whole `Spectres.json` file: one entry per raisable monster, keyed by its metadata id
 * such as `Metadata/Monsters/Axis/AxisCaster`. There is no envelope — the file is the
 * record.
 */
export type Spectres = Record<string, Spectre>;
