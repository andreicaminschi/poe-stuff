/**
 * Types and data for reading a `.filter` file.
 *
 * Declarations only, no logic. The condition registry is copied from
 * `docs/item-filter-syntax.md`, which is the grammar GGG publishes and therefore the whole
 * list of things a filter can look at. That is why `FilterItem` is not a cut-down model
 * that gets outgrown later: the language fixes its size.
 */

/** Every operator the grammar has. `=` is the default when a line omits one. */
export type Operator = "=" | "==" | "!" | "!=" | "<" | "<=" | ">" | ">=";

/** The operators that mean equality. The only ones text and boolean conditions accept. */
export const EQUALITY_OPERATORS = ["=", "==", "!", "!="] as const;

/** The operators that flip a condition, turning "any of these matched" into "none did". */
export const NEGATING_OPERATORS = ["!", "!="] as const;

/** A block header. `Continue` and `Import` are keywords in the doc but not block headers. */
export type Keyword = "Show" | "Hide" | "Minimal";

/**
 * How a condition compares. Stage 1 implements the first five; the parser throws on the
 * rest, naming the line, so a filter that uses one fails out loud instead of quietly
 * matching nothing.
 */
export type ConditionKind =
  | "boolean"
  | "numeric"
  | "ordered"
  | "strings"
  | "enums"
  // Stage 2 below. Each needs a small parser of its own.
  | "sockets"
  | "counted"
  | "gem";

/** The kinds stage 1 knows how to match. */
export const STAGE_1_KINDS = ["boolean", "numeric", "ordered", "strings", "enums"] as const;

/**
 * Every condition name in `docs/item-filter-syntax.md`, with the kind it compares as.
 * Closed value sets travel with the name so the parser can reject an off-list value.
 *
 * PoE2-only and deleted names are kept: they cost a line each, and leaving them out would
 * make this registry disagree with the document it is copied from.
 */
export const CONDITIONS = {
  // --- boolean -------------------------------------------------------------------------
  AlternateQuality: { kind: "boolean" },
  AlwaysShow: { kind: "boolean" }, // PoE2-only
  AnyEnchantment: { kind: "boolean" },
  BlightedMap: { kind: "boolean" },
  Corrupted: { kind: "boolean" },
  ElderItem: { kind: "boolean" },
  ElderMap: { kind: "boolean" },
  Exceptional: { kind: "boolean" },
  Foulborn: { kind: "boolean" },
  FracturedItem: { kind: "boolean" },
  HasCruciblePassiveTree: { kind: "boolean" },
  HasImplicitMod: { kind: "boolean" },
  HasVaalUniqueMod: { kind: "boolean" }, // PoE2-only
  Identified: { kind: "boolean" },
  Imbued: { kind: "boolean" },
  IsVaalUnique: { kind: "boolean" }, // PoE2-only
  MirageMap: { kind: "boolean" },
  Mirrored: { kind: "boolean" },
  Replica: { kind: "boolean" },
  Scourged: { kind: "boolean" },
  ShapedMap: { kind: "boolean" },
  ShaperItem: { kind: "boolean" },
  SynthesisedItem: { kind: "boolean" },
  TwiceCorrupted: { kind: "boolean" }, // PoE2-only
  UberBlightedMap: { kind: "boolean" },
  Vestigial: { kind: "boolean" },
  ZanaMemory: { kind: "boolean" },

  // --- numeric -------------------------------------------------------------------------
  AreaLevel: { kind: "numeric" },
  BaseArmour: { kind: "numeric" },
  BaseDefencePercentile: { kind: "numeric" },
  BaseEnergyShield: { kind: "numeric" },
  BaseEvasion: { kind: "numeric" },
  BaseWard: { kind: "numeric" },
  CorruptedMods: { kind: "numeric" },
  DropLevel: { kind: "numeric" },
  EnchantmentPassiveNum: { kind: "numeric" },
  GemLevel: { kind: "numeric" },
  HasEaterOfWorldsImplicit: { kind: "numeric" },
  HasSearingExarchImplicit: { kind: "numeric" },
  Height: { kind: "numeric" },
  ItemLevel: { kind: "numeric" },
  LinkedSockets: { kind: "numeric" },
  MapTier: { kind: "numeric" },
  MemoryStrands: { kind: "numeric" },
  Quality: { kind: "numeric" },
  StackSize: { kind: "numeric" },
  UnidentifiedItemTier: { kind: "numeric" }, // PoE2-only
  WaystoneTier: { kind: "numeric" }, // PoE2-only
  Width: { kind: "numeric" },

  // --- ordered -------------------------------------------------------------------------
  // The one condition the doc compares with `<` and `>` against named values.
  Rarity: { kind: "ordered", order: ["Normal", "Magic", "Rare", "Unique"] },

  // --- strings -------------------------------------------------------------------------
  // Open value sets. The doc names no whitelist for any of these.
  ArchnemesisMod: { kind: "strings" },
  BaseType: { kind: "strings" },
  Class: { kind: "strings" },
  EnchantmentPassiveNode: { kind: "strings" },

  // --- enums ---------------------------------------------------------------------------
  // An item can hold several at once, so the item side of these is a list.
  GemQualityType: {
    kind: "enums",
    values: ["Superior", "Divergent", "Anomalous", "Phantasmal"],
  }, // deleted from the game, kept because the doc still lists it
  HasInfluence: {
    kind: "enums",
    values: ["Shaper", "Elder", "Crusader", "Hunter", "Redeemer", "Warlord", "None"],
  },

  // --- stage 2 -------------------------------------------------------------------------
  SocketGroup: { kind: "sockets" },
  Sockets: { kind: "sockets" },
  HasEnchantment: { kind: "counted" },
  HasExplicitMod: { kind: "counted" },
  // "True/False, gem name" fits no single kind, so it waits for a matcher of its own.
  TransfiguredGem: { kind: "gem" },
} as const satisfies Record<
  string,
  {
    readonly kind: ConditionKind;
    /** Present on `ordered`: the ladder its values are compared along. */
    readonly order?: readonly string[];
    /** Present on `enums`: the closed set its values must come from. */
    readonly values?: readonly string[];
  }
>;

export type ConditionName = keyof typeof CONDITIONS;

/**
 * Action names, lowercased. Actions never change what matches, so the parser skips them —
 * but it has to know they are actions, otherwise a misspelled condition would be skipped
 * too and the block would quietly match more than it says.
 */
export const ACTIONS: ReadonlySet<string> = new Set([
  "customalertsound",
  "customalertsoundoptional",
  "disabledropsound",
  "disabledropsoundifalertsound",
  "enabledropsound",
  "enabledropsoundifalertsound",
  "minimapicon",
  "playalertsound",
  "playalertsoundpositional",
  "playeffect",
  "setbackgroundcolor",
  "setbordercolor",
  "setfontsize",
  "settextcolor",
]);

/**
 * Lowercased condition name to its canonical spelling. The game matches case-insensitively,
 * so the parser looks names up through here and stores the canonical one.
 */
export const CONDITIONS_BY_LOWER: ReadonlyMap<string, ConditionName> = new Map(
  (Object.keys(CONDITIONS) as ConditionName[]).map((name) => [name.toLowerCase(), name]),
);

/**
 * The keys a `#@` note may carry, and the values each one accepts.
 *
 * These are the words `@poe/filter` uses, written out rather than imported: this package
 * stands alone on purpose, and importing `Tier` or `Verb` would tie it to the package it is
 * meant to stay clear of. Adding a key is one line here.
 *
 * A `null` value list means any bare word is accepted.
 */
export const APPLY_KEYS = {
  tier: ["T0", "T1", "T2", "T3", "T4", "T5", "varies", "hidden"],
  verb: ["take", "check", "gamble"],
  family: [
    "bases",
    "corruptible-uniques",
    "div-cards",
    "foulborn",
    "fragments",
    "gems",
    "maps",
    "misc",
    "stackables",
    "unique-maps",
    "uniques-by-base",
  ],
  id: null,
} as const satisfies Record<string, readonly string[] | null>;

export type ApplyKey = keyof typeof APPLY_KEYS;

/** What the item holds for a condition of each kind. */
type KindValue<K extends ConditionKind> = K extends "boolean"
  ? boolean
  : K extends "numeric"
    ? number
    : K extends "enums" | "counted"
      ? readonly string[]
      : string;

/**
 * An item, as a filter sees it. Keyed by condition name, typed per condition kind, so
 * `{ Rarity: "Unique" }` compiles and `{ Rarity: 5 }` does not.
 *
 * A separate item parser produces these with defaults already filled in — quality is `0`
 * rather than missing, `Corrupted` is `false` rather than unknown. So inside the evaluator a
 * missing key means a real gap and fails its condition; it never stands for a default.
 *
 * The stage-2 kinds appear here even though the parser rejects them, because this is the
 * item model and it is complete whether or not every matcher is written yet.
 */
export type FilterItem = {
  readonly [K in ConditionName]?: KindValue<(typeof CONDITIONS)[K]["kind"]>;
};

/** One condition line, already split up and checked. */
export type FilterCondition = {
  readonly name: ConditionName;
  readonly kind: ConditionKind;
  readonly operator: Operator;
  readonly values: readonly string[];
  /** 1-based line this condition was read from. */
  readonly line: number;
};

/** One `key=value` pair off a `#@` line. */
export type Note = {
  readonly key: ApplyKey;
  readonly value: string;
  /** 1-based line the pair was read from, which is the note line, not the block header. */
  readonly line: number;
};

/** One `Show`/`Hide`/`Minimal` block: its conditions, its notes, and whether it continues. */
export type FilterBlock = {
  readonly keyword: Keyword;
  readonly conditions: readonly FilterCondition[];
  readonly notes: readonly Note[];
  /** Whether the block carries a `Continue` line. */
  readonly continues: boolean;
  /** 1-based line of the block header. */
  readonly line: number;
};

/** One note that survived into the result, tagged with the block that gave it. */
export type Contribution = {
  readonly key: ApplyKey;
  readonly value: string;
  /** 1-based line of the block header that set this, so a failing test can name it. */
  readonly line: number;
};

/** What the walk down the blocks came back with. */
export type EvalResult = {
  /** The keyword of the block that stopped the walk, or `none` if nothing stopped it. */
  readonly verdict: Keyword | "none";
  /** Every note that matched, later blocks beating earlier ones. */
  readonly notes: Readonly<Partial<Record<ApplyKey, string>>>;
  /** Every contribution in the order it was made, including ones later overwritten. */
  readonly contributions: readonly Contribution[];
};
