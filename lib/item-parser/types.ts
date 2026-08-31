/**
 * What one item copied out of the game becomes.
 *
 * Declarations only. The shape is deliberately close to the text it came from — a
 * property keeps the name the game printed, a modifier keeps its header verbatim — because
 * this package cannot know which of those a caller will care about, and inventing a
 * narrower model here would mean editing this file every time the game prints something
 * new. Nothing in these types enumerates an item class, a modifier, an affix name or a
 * tag; the parser reads the grammar and hands back whatever words it found.
 */

/** A `Key: Value` line out of a properties or requirements section. */
export type ItemProperty = {
  /** The left-hand side, without the qualifier the game brackets onto it. */
  readonly name: string;
  /** The right-hand side, with the `(augmented)` and `(unmet)` markers taken off. */
  readonly value: string;
  /** `Attribute Modifiers` out of `Quality (Attribute Modifiers)`, or `""`. */
  readonly qualifier: string;
  /** The game's marker for a value a modifier has raised above its base. */
  readonly augmented: boolean;
  /** The game's marker for a requirement the character does not meet. */
  readonly unmet: boolean;
  /**
   * Every number in the value, in the order printed, with the thousands commas gone —
   * `1,499/50,000` is `[1499, 50000]`. Which one means what is the caller's business:
   * this is a `Key: Value` line, not a schema.
   */
  readonly numbers: readonly number[];
};

/**
 * One roll on a modifier line: what it landed on, and the range it could have landed in.
 *
 * Only rolls the game wrote in its `149(145-159)` form appear here — a number with no
 * bracketed range beside it is indistinguishable from a number that is part of the wording,
 * so guessing is left alone. The values a stat actually searches on come out of
 * `StatMatch.values`, where the published stat text says where its numbers are.
 */
export type ModRoll = {
  readonly value: number;
  readonly min: number;
  readonly max: number;
};

/** One line of a modifier's text. A hybrid modifier has several. */
export type ModLine = {
  /** The line as printed, with a trailing `— Unscalable Value` taken off. */
  readonly text: string;
  readonly rolls: readonly ModRoll[];
  /** Whether the line carried the `— Unscalable Value` note. */
  readonly unscalable: boolean;
};

/** Where a modifier sits on the item, as far as the header says. */
export type Affix = "prefix" | "suffix" | "implicit" | "other";

/**
 * The `{ … }` line above a modifier, read for structure rather than matched against a list.
 *
 * `Master Crafted Prefix Modifier "Upgraded" — Gem` gives affix `prefix`, name `Upgraded`,
 * tags `["Gem"]` and qualifiers `["Master", "Crafted"]`. A header word this package has
 * never seen lands in `qualifiers` and costs nothing.
 */
export type ModHeader = {
  /** The header's contents, without the braces. */
  readonly raw: string;
  readonly affix: Affix;
  /** The affix name the game quotes, or `""` when it quotes none. */
  readonly name: string;
  /** The `(Tier: N)` the header carries, or `undefined`. */
  readonly tier: number | undefined;
  /** The first `—` clause, split on commas. */
  readonly tags: readonly string[];
  /** Every word before the affix word: `["Master", "Crafted"]`, `["Corruption"]`. */
  readonly qualifiers: readonly string[];
  /** Any further `—` clause, kept whole — a unique's `20% Increased` quality note. */
  readonly extra: readonly string[];
};

/** One modifier: its header, its text, and the reminder text the game prints under it. */
export type ItemMod = {
  readonly header: ModHeader;
  readonly lines: readonly ModLine[];
  /** The parenthesised explanations under the modifier, kept but never matched. */
  readonly reminders: readonly string[];
};

/**
 * Something the parser could not place. Never thrown, always reported.
 *
 * `orphan-mod-line` is a line inside a modifier section with no header above it, which the
 * advanced format never prints. `empty-item` is text with no sections at all.
 */
export type ParseIssue = {
  readonly kind: "orphan-mod-line" | "empty-item";
  readonly line: string;
  /** 1-based section the line was in. */
  readonly section: number;
};

/**
 * One item.
 *
 * `name` is `""` for an item the game prints under a single line, which is every rarity
 * below rare — `baseType` is then the whole of it, which is also what a filter's `BaseType`
 * wants to compare against.
 */
export type ParsedItem = {
  readonly itemClass: string;
  readonly rarity: string;
  readonly name: string;
  readonly baseType: string;
  readonly properties: readonly ItemProperty[];
  readonly requirements: readonly ItemProperty[];
  /** Linked groups, colours only: `Sockets: R-G-B B-B` is `["RGB", "BB"]`. */
  readonly sockets: readonly string[];
  readonly mods: readonly ItemMod[];
  /**
   * Every bare line that is neither a property nor a modifier: `Corrupted`, `Shaper Item`,
   * `Abyss`, `Foil Unique (Cobalt)`. Kept verbatim and uninterpreted — the only file that
   * reads meaning into these is the filter adapter, because the filter language is the
   * only thing that fixes which of them have a name.
   */
  readonly flags: readonly string[];
  /** Flavour text, help text, and anything else that is prose. One entry per section. */
  readonly extraSections: readonly (readonly string[])[];
  readonly issues: readonly ParseIssue[];
};

/** One option of a stat whose `#` is picked from a list rather than typed as a number. */
export type PublishedStatOption = {
  readonly id: string | number;
  readonly text: string;
};

/**
 * One entry of the stat list `modMatcher` is built over: what the trade site will let you
 * search for, and the text it indexes that search under.
 *
 * **Declared here rather than imported, and that is the point.** The list comes from GGG
 * today — `createGGGService(…).getStats()` answers with exactly this shape, so it passes
 * straight in — but this package must not depend on a service to say what its own input
 * is. Naming the shape here is what keeps `@poe/item-parser` a library: it is handed a
 * list, and it never learns where the list came from.
 *
 * `type` is one of `explicit`, `implicit`, `pseudo`, `fractured`, `enchant`, `crafted`,
 * `veiled`, `imbued`, `scourge`, `crucible`, `delve`, `ultimatum`, `sanctum`, `mercenary`.
 */
export type PublishedStat = {
  /** The trade id, `explicit.stat_3299347043`. */
  readonly id: string;
  /** The stat's own text, with its `#` placeholders. */
  readonly text: string;
  readonly type: string;
  /** Present when a query carries an option id instead of a number. */
  readonly options?: readonly PublishedStatOption[];
};

/**
 * One published stat a modifier line could be. Several is normal — GGG publishes the same
 * wording under `explicit`, `implicit`, `fractured` and more, and sometimes twice under one
 * type.
 */
export type StatMatch = {
  /** The trade id, `explicit.stat_3299347043`. */
  readonly id: string;
  /** The stat's own text, with its `#` placeholders. */
  readonly text: string;
  /** The stat's type: `explicit`, `implicit`, `crafted`, `enchant`, … */
  readonly type: string;
  /**
   * The option this stat was matched on, for the stats GGG publishes as a list of named
   * choices rather than a number. `undefined` for every other stat. A trade query naming
   * this stat has to send it back.
   */
  readonly option: string | number | undefined;
  /**
   * The numbers standing where the stat's `#` placeholders are, in order. Empty when the
   * stat has no placeholder.
   */
  readonly values: readonly number[];
  /** Whether the header's own words asked for this stat's type. */
  readonly preferred: boolean;
};

/** A modifier, once the published stat list has had a look at it. */
export type ResolvedMod = ItemMod & {
  /** Every stat this could be, preferred ones first. Empty when nothing matched. */
  readonly stats: readonly StatMatch[];
  /**
   * Pseudo stats whose text is the same as this modifier's — the trade site's aliases for
   * temple rooms, logbook areas and lake reflections. Several of those are published as a
   * pseudo and nothing else, so a modifier can have a pseudo here and no `stats` at all.
   * Aggregate pseudos, the `+# total maximum Life` family, are not derived; see
   * `techdebt.md`.
   */
  readonly pseudos: readonly StatMatch[];
};

/** An item whose modifiers have been looked up. */
export type ResolvedItem = Omit<ParsedItem, "mods"> & {
  readonly mods: readonly ResolvedMod[];
  /** The text of every modifier line group that matched nothing, for reporting. */
  readonly unmatched: readonly string[];
};
