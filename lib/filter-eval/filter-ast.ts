/**
 * Types and data for reading a `.filter` file.
 *
 * Declarations only, no logic. The condition registry is copied from
 * `docs/item-filter-syntax.md`, which is the grammar GGG publishes and therefore the whole
 * list of things a filter can look at. That is why `FilterItem` is not a cut-down model
 * that gets outgrown later: the language fixes its size.
 */

/** The games a condition name belongs to. */
export const GAMES = ["poe1", "poe2"] as const;

export type Game = (typeof GAMES)[number];

const POE1 = ["poe1"] as const satisfies readonly Game[];
const POE2 = ["poe2"] as const satisfies readonly Game[];

/** Every operator the grammar has. `=` is the default when a line omits one. */
export type Operator = "=" | "==" | "!" | "!=" | "<" | "<=" | ">" | ">=";

/** The operators that mean equality. The only ones text and boolean conditions accept. */
export const EQUALITY_OPERATORS = ["=", "==", "!", "!="] as const;

/** The operators that flip a condition, turning "any of these matched" into "none did". */
export const NEGATING_OPERATORS = ["!", "!="] as const;

/** A block header. `Continue` and `Import` are keywords in the doc but not block headers. */
export type Keyword = "Show" | "Hide" | "Minimal";

/** How a condition compares. Every kind here has a parser and a matcher. */
export type ConditionKind =
  | "boolean"
  | "numeric"
  | "ordered"
  | "strings"
  | "enums"
  | "sockets"
  | "counted"
  | "gem";

/** `R` red, `G` green, `B` blue, `A` abyss, `D` delve, `W` white. */
export type SocketColour = "R" | "G" | "B" | "A" | "D" | "W";

export const SOCKET_COLOURS = ["R", "G", "B", "A", "D", "W"] as const;

/**
 * What a socket line asks for. `5GGG` is a count of 5 and three greens; `AAAA` is four
 * abyss sockets and no count at all; `6` is a count and no colours.
 *
 * The operator applies to the count. Colours are always "at least", which is the reading
 * the syntax doc puts on its own `SocketGroup >= 5GGG` example — five or more sockets with
 * three or more green — and the only one that leaves `SocketGroup "RGB"`, the chromatic
 * recipe, matching anything.
 */
export type SocketSpec = {
  /** Absent when the line named only colours. */
  readonly count?: number;
  /** How many of each colour are wanted, at minimum. */
  readonly colours: Readonly<Partial<Record<SocketColour, number>>>;
};

/**
 * Every condition name in `docs/item-filter-syntax.md`, with the kind it compares as.
 * Closed value sets travel with the name so the parser can reject an off-list value.
 *
 * PoE2-only and deleted names are kept: they cost a line each, and leaving them out would
 * make this registry disagree with the document it is copied from. `games` says which game
 * a name belongs to.
 */
export const CONDITIONS = {
  // --- boolean -------------------------------------------------------------------------
  AlternateQuality: { kind: "boolean", games: POE1 },
  AlwaysShow: { kind: "boolean", games: POE2 },
  AnyEnchantment: { kind: "boolean", games: POE1 },
  BlightedMap: { kind: "boolean", games: POE1 },
  Corrupted: { kind: "boolean", games: POE1 },
  ElderItem: { kind: "boolean", games: POE1 },
  ElderMap: { kind: "boolean", games: POE1 },
  Exceptional: { kind: "boolean", games: POE1 },
  Foulborn: { kind: "boolean", games: POE1 },
  FracturedItem: { kind: "boolean", games: POE1 },
  HasCruciblePassiveTree: { kind: "boolean", games: POE1 },
  HasImplicitMod: { kind: "boolean", games: POE1 },
  HasVaalUniqueMod: { kind: "boolean", games: POE2 },
  Identified: { kind: "boolean", games: POE1 },
  Imbued: { kind: "boolean", games: POE1 },
  IsVaalUnique: { kind: "boolean", games: POE2 },
  MirageMap: { kind: "boolean", games: POE1 },
  Mirrored: { kind: "boolean", games: POE1 },
  Replica: { kind: "boolean", games: POE1 },
  Scourged: { kind: "boolean", games: POE1 },
  ShapedMap: { kind: "boolean", games: POE1 },
  ShaperItem: { kind: "boolean", games: POE1 },
  SynthesisedItem: { kind: "boolean", games: POE1 },
  TwiceCorrupted: { kind: "boolean", games: POE2 },
  UberBlightedMap: { kind: "boolean", games: POE1 },
  Vestigial: { kind: "boolean", games: POE1 },
  ZanaMemory: { kind: "boolean", games: POE1 },

  // --- numeric -------------------------------------------------------------------------
  AreaLevel: { kind: "numeric", games: POE1 },
  BaseArmour: { kind: "numeric", games: POE1 },
  BaseDefencePercentile: { kind: "numeric", games: POE1 },
  BaseEnergyShield: { kind: "numeric", games: POE1 },
  BaseEvasion: { kind: "numeric", games: POE1 },
  BaseWard: { kind: "numeric", games: POE1 },
  CorruptedMods: { kind: "numeric", games: POE1 },
  DropLevel: { kind: "numeric", games: POE1 },
  EnchantmentPassiveNum: { kind: "numeric", games: POE1 },
  GemLevel: { kind: "numeric", games: POE1 },
  HasEaterOfWorldsImplicit: { kind: "numeric", games: POE1 },
  HasSearingExarchImplicit: { kind: "numeric", games: POE1 },
  Height: { kind: "numeric", games: POE1 },
  ItemLevel: { kind: "numeric", games: POE1 },
  LinkedSockets: { kind: "numeric", games: POE1 },
  MapTier: { kind: "numeric", games: POE1 },
  MemoryStrands: { kind: "numeric", games: POE1 },
  Quality: { kind: "numeric", games: POE1 },
  StackSize: { kind: "numeric", games: POE1 },
  UnidentifiedItemTier: { kind: "numeric", games: POE2 },
  WaystoneTier: { kind: "numeric", games: POE2 },
  Width: { kind: "numeric", games: POE1 },

  // --- ordered -------------------------------------------------------------------------
  // The one condition the doc compares with `<` and `>` against named values.
  Rarity: { kind: "ordered", order: ["Normal", "Magic", "Rare", "Unique"], games: POE1 },

  // --- strings -------------------------------------------------------------------------
  // Open value sets. The doc names no whitelist for any of these.
  ArchnemesisMod: { kind: "strings", games: POE1 },
  BaseType: { kind: "strings", games: POE1 },
  Class: { kind: "strings", games: POE1 },
  EnchantmentPassiveNode: { kind: "strings", games: POE1 },

  // --- enums ---------------------------------------------------------------------------
  // An item can hold several at once, so the item side of these is a list.
  GemQualityType: {
    kind: "enums",
    values: ["Superior", "Divergent", "Anomalous", "Phantasmal"],
    games: POE1,
  }, // deleted from the game, kept because the doc still lists it
  HasInfluence: {
    kind: "enums",
    values: ["Shaper", "Elder", "Crusader", "Hunter", "Redeemer", "Warlord", "None"],
    games: POE1,
  },

  // --- sockets -------------------------------------------------------------------------
  // `SocketGroup` asks within one linked group, `Sockets` ignores the links.
  SocketGroup: { kind: "sockets", games: POE1 },
  Sockets: { kind: "sockets", games: POE1 },

  // --- counted -------------------------------------------------------------------------
  // A list of names with an optional count of how many of them must be present.
  HasEnchantment: { kind: "counted", games: POE1 },
  HasExplicitMod: { kind: "counted", games: POE1 },

  // --- gem -----------------------------------------------------------------------------
  // "True/False, gem name" — the only condition that takes either.
  TransfiguredGem: { kind: "gem", games: POE1 },
} as const satisfies Record<
  string,
  {
    readonly kind: ConditionKind;
    readonly games: readonly Game[];
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
 */
export const APPLY_KEYS = {
  tier: ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "varies", "hidden", "want"],
  /**
   * The rung a block's items could turn out to belong to, where that is louder than the one
   * they are drawn at. Written only when it differs from `tier`.
   */
  upto: ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "varies", "hidden"],
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
    "replicas",
    "stackables",
    "unique-maps",
    "uniques-by-base",
  ],
} as const satisfies Record<string, readonly string[]>;

export type ApplyKey = keyof typeof APPLY_KEYS;

/**
 * The keys every block has to carry. A generated filter that leaves one out is a generator
 * that forgot what the block was for, which is the thing this package exists to catch.
 */
export const REQUIRED_KEYS = ["tier", "verb"] as const;

/**
 * What the item holds for a condition of each kind.
 *
 * `sockets` is the item's sockets as space-separated linked groups — `"RGB BB"` is a linked
 * red-green-blue and a linked pair of blues. `Sockets` reads every letter and ignores the
 * spaces; `SocketGroup` tries each group on its own.
 *
 * `gem` is the name of the transfigured gem, and `""` for an item that is not one.
 */
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
  /** Present on `sockets`: the count and colours the line asks for. */
  readonly sockets?: SocketSpec;
  /**
   * Present on `counted`: how many of the listed names must be there, compared with
   * `operator`. A line that writes no count means one or more.
   */
  readonly count?: number;
  /**
   * The comment trailing this line, without its `#`, or `""`. Where a generator records
   * which bucket asked for the condition — the line itself stays a real filter line, so
   * what gets validated is what the game runs.
   */
  readonly comment: string;
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

/**
 * One `Show`/`Hide`/`Minimal` block.
 *
 * Every block ends with its `#@` line, and that line carries at least `tier` and `verb`.
 * The shape is fixed on purpose: this reads filters a generator wrote, and a block that
 * cannot say what it is for is a bug in the generator.
 */
export type FilterBlock = {
  readonly keyword: Keyword;
  readonly conditions: readonly FilterCondition[];
  readonly notes: readonly Note[];
  /** Whatever followed the pairs on the `#@` line, kept verbatim. `""` when there was none. */
  readonly freehand: string;
  /** The comment trailing the block header, without its `#`, or `""`. */
  readonly comment: string;
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

/** One block that matched, for reading back when a validation fails. */
export type MatchedBlock = {
  /** 1-based line of the block header. */
  readonly line: number;
  readonly keyword: Keyword;
  /** The block's freehand debug text, or `""`. */
  readonly freehand: string;
};

/** What the walk down the blocks came back with. */
export type EvalResult = {
  /** The keyword of the block that stopped the walk, or `none` if nothing stopped it. */
  readonly verdict: Keyword | "none";
  /** Every note that matched, later blocks beating earlier ones. */
  readonly notes: Readonly<Partial<Record<ApplyKey, string>>>;
  /** Every contribution in the order it was made, including ones later overwritten. */
  readonly contributions: readonly Contribution[];
  /** Every block that matched, in order, with the freehand its author left behind. */
  readonly matched: readonly MatchedBlock[];
};
