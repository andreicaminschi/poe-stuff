import { describe, it, expect } from "@jest/globals";
import { parseFilter } from "./parse-filter.ts";

/** Joins lines so a fixture's line numbers are the ones the test reads about. */
const filter = (...lines: string[]): string => lines.join("\n");

/** The `#@` line every block has to end with, when the test does not care what it says. */
const NOTE = "\t#@ tier=T1 verb=take";

/** One block, with that note appended, for the tests that are about something else. */
const annotated = (...lines: string[]): string => filter(...lines, NOTE);

describe("parseFilter", () => {
  it("reads a block header and the conditions under it", () => {
    const [block] = parseFilter(annotated("Show", "\tFoulborn True", "\tRarity Unique"));

    expect(block?.keyword).toBe("Show");
    expect(block?.line).toBe(1);
    expect(block?.conditions).toHaveLength(2);
    expect(block?.conditions[0]?.name).toBe("Foulborn");
    expect(block?.conditions[0]?.line).toBe(2);
    expect(block?.conditions[1]?.name).toBe("Rarity");
  });

  it("starts a new block at every header and closes the one before it", () => {
    const blocks = parseFilter(
      filter(
        "Show",
        "\tRarity Unique",
        NOTE,
        "Hide",
        "\tRarity Normal",
        NOTE,
        "Minimal",
        "\tQuality 0",
        NOTE,
      ),
    );

    expect(blocks.map((block) => block.keyword)).toEqual(["Show", "Hide", "Minimal"]);
    expect(blocks.map((block) => block.line)).toEqual([1, 4, 7]);
    expect(blocks.every((block) => block.conditions.length === 1)).toBe(true);
  });

  it("defaults the operator to = when the line leaves it out", () => {
    const [block] = parseFilter(annotated("Show", "\tStackSize 5"));

    expect(block?.conditions[0]?.operator).toBe("=");
    expect(block?.conditions[0]?.values).toEqual(["5"]);
  });

  it("keeps whichever comparison operator a numeric condition was given", () => {
    for (const operator of ["=", "==", "!", "!=", "<", "<=", ">", ">="]) {
      const [block] = parseFilter(annotated("Show", `\tItemLevel ${operator} 68`));

      expect(block?.conditions[0]?.operator).toBe(operator);
      expect(block?.conditions[0]?.values).toEqual(["68"]);
    }
  });

  it("keeps a quoted value whole when it contains spaces", () => {
    const [block] = parseFilter(annotated("Show", '\tBaseType "Chaos Orb"'));

    expect(block?.conditions[0]?.values).toEqual(["Chaos Orb"]);
  });

  it("reads every value when a condition lists several", () => {
    const [block] = parseFilter(
      annotated("Show", '\tBaseType "Chaos Orb" "Divine Orb" Alteration'),
    );

    expect(block?.conditions[0]?.values).toEqual(["Chaos Orb", "Divine Orb", "Alteration"]);
  });

  it("lets an ordered condition list several values when it is not comparing", () => {
    // The NeverSink sample writes this on 189 of its 454 Rarity lines.
    const [block] = parseFilter(annotated("Show", "\tRarity Normal Magic Rare"));

    expect(block?.conditions[0]?.values).toEqual(["Normal", "Magic", "Rare"]);
  });

  it("holds an ordered condition to one value when it walks the ladder", () => {
    expect(() => parseFilter(annotated("Show", "\tRarity > Magic Rare"))).toThrow(
      /line 2: Rarity takes exactly one value, got 2/,
    );
  });

  it("checks every value in an ordered list, not just the first", () => {
    expect(() => parseFilter(annotated("Show", "\tRarity Normal Legendary"))).toThrow(
      /line 2: Rarity takes one of Normal, Magic, Rare, Unique, got "Legendary"/,
    );
  });

  it("marks a block as continuing only when it says Continue", () => {
    const blocks = parseFilter(
      filter("Show", "\tRarity Unique", "\tContinue", NOTE, "Show", "\tRarity Rare", NOTE),
    );

    expect(blocks[0]?.continues).toBe(true);
    expect(blocks[1]?.continues).toBe(false);
  });

  it("reads every pair on the one #@ line a block is allowed", () => {
    const [block] = parseFilter(
      filter("Show", "\tRarity Unique", "\t#@ tier=T1 verb=take family=foulborn"),
    );

    expect(block?.notes).toEqual([
      { key: "tier", value: "T1", line: 3 },
      { key: "verb", value: "take", line: 3 },
      { key: "family", value: "foulborn", line: 3 },
    ]);
  });

  it("keeps whatever followed the pairs as freehand, verbatim", () => {
    const [block] = parseFilter(
      filter("Show", "\tRarity Unique", "\t#@ tier=T1 verb=take bucket uniq-chase-3, ev 42c"),
    );

    expect(block?.freehand).toBe("bucket uniq-chase-3, ev 42c");
    expect(block?.notes.map((note) => note.key)).toEqual(["tier", "verb"]);
  });

  it("leaves freehand empty when the note is only pairs", () => {
    const [block] = parseFilter(annotated("Show", "\tRarity Unique"));

    expect(block?.freehand).toBe("");
  });

  it("ignores a comment that is not a note", () => {
    const [block] = parseFilter(
      annotated("Show", "\t# a plain comment", "\tRarity Unique"),
    );

    expect(block?.notes.map((note) => note.key)).toEqual(["tier", "verb"]);
    expect(block?.conditions).toHaveLength(1);
  });

  it("ignores a #@ lookalike with no space after the prefix", () => {
    // `#@tier=T1` is a plain comment, so the block still needs a real note after it.
    const [block] = parseFilter(annotated("Show", "\tRarity Unique", "\t#@tier=T1"));

    expect(block?.notes).toEqual([
      { key: "tier", value: "T1", line: 4 },
      { key: "verb", value: "take", line: 4 },
    ]);
  });

  it("drops the trailing comment real filters put after a block header", () => {
    // The NeverSink sample writes this 784 times.
    const blocks = parseFilter(
      annotated("Show # %D8 $type->6l $tier->hightier", "\tRarity Unique # and here"),
    );

    expect(blocks[0]?.keyword).toBe("Show");
    expect(blocks[0]?.conditions[0]?.values).toEqual(["Unique"]);
  });

  it("does not treat a # inside a quoted value as the start of a comment", () => {
    const [block] = parseFilter(annotated("Show", '\tBaseType "Rune #3" # real comment'));

    expect(block?.conditions[0]?.values).toEqual(["Rune #3"]);
  });

  it("skips actions without letting them become conditions", () => {
    const [block] = parseFilter(
      annotated(
        "Show",
        "\tRarity Unique",
        "\tSetTextColor 255 0 0",
        "\tSetFontSize 45",
        "\tMinimapIcon 2 Cyan Diamond",
        "\tPlayEffect Red Temp",
        "\tCustomAlertSound \"Map.mp3\"",
        "\tDisableDropSound",
      ),
    );

    expect(block?.conditions).toHaveLength(1);
  });

  it("reads keywords, condition names and values whatever the case", () => {
    const [block] = parseFilter(
      annotated("show", "\tcorrupted TRUE", "\trarity unique", "\thasinfluence shaper"),
    );

    expect(block?.keyword).toBe("Show");
    expect(block?.conditions.map((condition) => condition.name)).toEqual([
      "Corrupted",
      "Rarity",
      "HasInfluence",
    ]);
  });

  it("records the kind alongside each condition", () => {
    const [block] = parseFilter(
      annotated("Show", "\tCorrupted True", "\tItemLevel > 68", "\tBaseType Orb"),
    );

    expect(block?.conditions.map((condition) => condition.kind)).toEqual([
      "boolean",
      "numeric",
      "strings",
    ]);
  });

  it("throws on a condition name that is not in the grammar", () => {
    expect(() => parseFilter(annotated("Show", "\tRariti Unique"))).toThrow(
      /line 2: unknown condition "Rariti"/,
    );
  });

  it("throws on Import rather than reading another file", () => {
    expect(() => parseFilter(annotated('Import "Other.filter"'))).toThrow(
      /line 1: Import is not supported/,
    );
  });

  it("reads a socket line that names only a count", () => {
    const [block] = parseFilter(annotated("Show", "\tSockets >= 3"));

    expect(block?.conditions[0]?.operator).toBe(">=");
    expect(block?.conditions[0]?.sockets).toEqual({ count: 3, colours: {} });
  });

  it("reads a socket line that names only colours", () => {
    // The sample writes `Sockets >= AAAA` for abyss sockets, with no count at all.
    const [block] = parseFilter(annotated("Show", "\tSockets >= AAAA"));

    expect(block?.conditions[0]?.sockets).toEqual({ colours: { A: 4 } });
  });

  it("reads a socket line that names both, counting each colour", () => {
    const [block] = parseFilter(annotated("Show", "\tSocketGroup >= 5GGG"));

    expect(block?.conditions[0]?.sockets).toEqual({ count: 5, colours: { G: 3 } });
  });

  it("reads a quoted socket spec with the operator left out", () => {
    const [block] = parseFilter(annotated("Show", '\tSocketGroup "RGB"'));

    expect(block?.conditions[0]?.operator).toBe("=");
    expect(block?.conditions[0]?.sockets).toEqual({ colours: { R: 1, G: 1, B: 1 } });
  });

  it("reads socket colours whatever case they are written in", () => {
    const [block] = parseFilter(annotated("Show", "\tSockets 5ggg"));

    expect(block?.conditions[0]?.sockets).toEqual({ count: 5, colours: { G: 3 } });
  });

  it("throws on a socket colour that is not one of the six", () => {
    expect(() => parseFilter(annotated("Show", "\tSockets >= 5GGX"))).toThrow(
      /line 2: Sockets does not know the socket colour "X": it takes R, G, B, A, D, W/,
    );
  });

  it("throws on a socket spec that is neither a count nor colours", () => {
    expect(() => parseFilter(annotated("Show", '\tSockets ""'))).toThrow(
      /line 2: Sockets takes a count and colours/,
    );
  });

  it("reads a count glued to its operator the way the sample writes it", () => {
    const [block] = parseFilter(
      annotated("Show", '\tHasExplicitMod >=2 "of Haast" "of Tzteosh"'),
    );

    expect(block?.conditions[0]).toMatchObject({
      operator: ">=",
      count: 2,
      values: ["of Haast", "of Tzteosh"],
    });
  });

  it("reads a zero count as asking for none of the listed names", () => {
    // 28 lines in the sample are `HasExplicitMod =0 "..."`.
    const [block] = parseFilter(annotated("Show", '\tHasExplicitMod =0 "Shining" "Glowing"'));

    expect(block?.conditions[0]).toMatchObject({ operator: "=", count: 0 });
  });

  it("reads a count spaced away from its operator, as the syntax doc writes it", () => {
    const [block] = parseFilter(annotated("Show", '\tHasExplicitMod >= 4 "of Haast"'));

    expect(block?.conditions[0]).toMatchObject({
      operator: ">=",
      count: 4,
      values: ["of Haast"],
    });
  });

  it("takes a counted line with no count as asking for at least one", () => {
    const [block] = parseFilter(annotated("Show", '\tHasExplicitMod "Tyrannical" "Merciless"'));

    expect(block?.conditions[0]).toMatchObject({
      operator: ">=",
      count: 1,
      values: ["Tyrannical", "Merciless"],
    });
  });

  it("takes a negated counted line with no count as asking for none", () => {
    const [block] = parseFilter(annotated("Show", '\tHasExplicitMod ! "Tyrannical"'));

    expect(block?.conditions[0]).toMatchObject({ operator: "=", count: 0 });
  });

  it("throws when a count is given but no names to count", () => {
    expect(() => parseFilter(annotated("Show", "\tHasExplicitMod >=2"))).toThrow(
      /line 2: HasExplicitMod needs at least one value/,
    );
  });

  it("reads TransfiguredGem both as a flag and as a name", () => {
    const [flag] = parseFilter(annotated("Show", "\tTransfiguredGem True"));
    expect(flag?.conditions[0]).toMatchObject({ kind: "gem", values: ["True"] });

    const [named] = parseFilter(annotated("Show", '\tTransfiguredGem "Leap Slam"'));
    expect(named?.conditions[0]).toMatchObject({ kind: "gem", values: ["Leap Slam"] });
  });

  it("throws when TransfiguredGem is given more than one value", () => {
    expect(() => parseFilter(annotated("Show", "\tTransfiguredGem True False"))).toThrow(
      /line 2: TransfiguredGem takes exactly one value, got 2/,
    );
  });

  it("throws when a text condition is given an ordering operator", () => {
    expect(() => parseFilter(annotated("Show", '\tBaseType > "Chaos Orb"'))).toThrow(
      /line 2: BaseType does not take the operator ">"/,
    );
    expect(() => parseFilter(annotated("Show", "\tCorrupted < True"))).toThrow(
      /Corrupted does not take the operator "<"/,
    );
    expect(() => parseFilter(annotated("Show", "\tHasInfluence <= Shaper"))).toThrow(
      /HasInfluence does not take the operator "<="/,
    );
  });

  it("throws when a single-value condition is given more than one", () => {
    expect(() => parseFilter(annotated("Show", "\tCorrupted True False"))).toThrow(
      /line 2: Corrupted takes exactly one value, got 2/,
    );
  });

  it("throws when a condition is given no value at all", () => {
    expect(() => parseFilter(annotated("Show", "\tItemLevel >="))).toThrow(
      /line 2: ItemLevel needs at least one value/,
    );
  });

  it("throws when a numeric condition is given something that is not a number", () => {
    expect(() => parseFilter(annotated("Show", "\tItemLevel > high"))).toThrow(
      /line 2: ItemLevel takes a number, got "high"/,
    );
  });

  it("throws when a boolean condition is given anything but True or False", () => {
    expect(() => parseFilter(annotated("Show", "\tCorrupted Maybe"))).toThrow(
      /line 2: Corrupted takes True or False, got "Maybe"/,
    );
  });

  it("throws when an ordered or enum value is off its list", () => {
    expect(() => parseFilter(annotated("Show", "\tRarity Legendary"))).toThrow(
      /line 2: Rarity takes one of Normal, Magic, Rare, Unique/,
    );
    expect(() => parseFilter(annotated("Show", "\tHasInfluence Shaper Eldar"))).toThrow(
      /line 2: HasInfluence takes one of .*got "Eldar"/,
    );
  });

  it("throws on a quote that never closes", () => {
    expect(() => parseFilter(annotated("Show", '\tBaseType "Chaos Orb'))).toThrow(
      /line 2: unterminated quote/,
    );
  });

  it("throws on a token that looks like a pair but is malformed", () => {
    // These have an `=`, so they are a botched pair rather than the start of the freehand.
    expect(() => parseFilter(filter("Show", "\t#@ Tier=T1 verb=take"))).toThrow(
      /line 2: bad note pair "Tier=T1"/,
    );
    expect(() => parseFilter(filter("Show", "\t#@ tier= verb=take"))).toThrow(
      /line 2: bad note pair "tier="/,
    );
  });

  it("treats a token with no = as the start of the freehand, not a bad pair", () => {
    const [block] = parseFilter(filter("Show", "\t#@ tier=T1 verb=take tier T1"));

    expect(block?.freehand).toBe("tier T1");
  });

  it("stops reading pairs once the freehand has started", () => {
    // `verb=take` sits after a bare word, so it is prose and the note has no verb.
    expect(() => parseFilter(filter("Show", "\t#@ tier=T1 note verb=take"))).toThrow(
      /line 2: a #@ note needs tier and verb, and this one has no verb/,
    );
  });

  it("throws on a note key nobody has declared", () => {
    expect(() => parseFilter(annotated("Show", "\t#@ colour=red"))).toThrow(
      /line 2: unknown note key "colour"/,
    );
  });

  it("throws on a note value that is off its key's list", () => {
    expect(() => parseFilter(annotated("Show", "\t#@ tier=T9"))).toThrow(
      /line 2: tier takes one of T0, T1, T2, T3, T4, T5, T6, varies, hidden, got "T9"/,
    );
    expect(() => parseFilter(annotated("Show", "\t#@ verb=Take"))).toThrow(
      /line 2: verb takes one of take, check, gamble, got "Take"/,
    );
  });

  it("throws on a #@ line carrying no pairs", () => {
    expect(() => parseFilter(filter("Show", "\t#@"))).toThrow(
      /line 2: a #@ note needs tier and verb, and this one has no tier/,
    );
  });

  it("throws when a note is missing tier or verb", () => {
    expect(() => parseFilter(filter("Show", "\tRarity Unique", "\t#@ verb=take"))).toThrow(
      /line 3: a #@ note needs tier and verb, and this one has no tier/,
    );
    expect(() => parseFilter(filter("Show", "\tRarity Unique", "\t#@ tier=T1"))).toThrow(
      /line 3: a #@ note needs tier and verb, and this one has no verb/,
    );
  });

  it("throws when a block has no #@ note at all", () => {
    expect(() => parseFilter(filter("Show", "\tRarity Unique"))).toThrow(
      /the block on line 1 has no #@ note, and every block needs one/,
    );
    // Including when a later block does have one.
    expect(() =>
      parseFilter(filter("Show", "\tRarity Unique", "Show", "\tRarity Rare", NOTE)),
    ).toThrow(/the block on line 1 has no #@ note/);
  });

  it("throws when anything follows the #@ note inside the block", () => {
    expect(() =>
      parseFilter(filter("Show", "\tRarity Unique", NOTE, "\tSetFontSize 45")),
    ).toThrow(/line 4: .* after the #@ note, which has to be the block's last line/);

    expect(() =>
      parseFilter(filter("Show", "\tRarity Unique", NOTE, "\tContinue")),
    ).toThrow(/line 4: Continue after the #@ note/);

    expect(() =>
      parseFilter(filter("Show", "\tRarity Unique", NOTE, "\tCorrupted True")),
    ).toThrow(/line 4: the condition Corrupted after the #@ note/);
  });

  it("throws when anything appears before the first block header", () => {
    expect(() => parseFilter(annotated("Rarity Unique"))).toThrow(
      /line 1: the condition Rarity before any Show, Hide or Minimal block/,
    );
    expect(() => parseFilter(annotated("#@ tier=T1"))).toThrow(
      /line 1: a #@ note before any Show, Hide or Minimal block/,
    );
    expect(() => parseFilter(annotated("Continue"))).toThrow(
      /line 1: Continue before any Show, Hide or Minimal block/,
    );
  });

  it("throws when a block header carries anything but a comment", () => {
    expect(() => parseFilter(annotated("Show Rarity Unique"))).toThrow(
      /line 1: Show takes nothing after it, got "Rarity Unique"/,
    );
  });
});
