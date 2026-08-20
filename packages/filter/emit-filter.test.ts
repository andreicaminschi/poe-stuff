import { describe, it, expect } from "@jest/globals";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { emitFilter, planBlocks } from "./emit-filter.ts";
import type { Bucket } from "./types.ts";

/**
 * Buckets in, filter text out.
 *
 * The emitter does two things that pull against each other: every bucket has to reach the
 * file, and the file has to be as few blocks as the buckets allow. So most of what follows
 * is about the merge — what it may fold together, and what it must leave apart.
 *
 * Fixtures are written out rather than read from `buckets-draft.json`. That file is an
 * untracked artefact of a classifier run against a live market, and a test that moves with
 * the market is a test that says nothing on the day it fails.
 */

/** Everything a bucket carries that this module does not read, at zero. */
const BLANK: Bucket = {
  id: "",
  family: "misc",
  verb: "take",
  tier: "T3",
  floor: 0,
  ceiling: 0,
  ratio: 1,
  ev: 0,
  vaalable: false,
  vaalCeiling: 0,
  vaalFloor: 0,
  thin: false,
  members: 1,
  slots: 1,
  note: "",
  conditions: [],
  minStack: 0,
  setBy: "",
  fromExchange: false,
  alwaysShow: false,
  examples: [],
};

const bucket = (over: Partial<Bucket>): Bucket => ({ ...BLANK, ...over });

const HEAVY_BELT = bucket({
  id: "unique:Heavy Belt",
  family: "uniques-by-base",
  verb: "check",
  tier: "T0",
  floor: 1,
  ceiling: 32987.52,
  ev: 9896.256,
  members: 8,
  setBy: "Mageblood 33kc",
  conditions: ["Rarity Unique", 'BaseType == "Heavy Belt"'],
});

const LEATHER_BELT = bucket({
  ...HEAVY_BELT,
  id: "unique:Leather Belt",
  conditions: ["Rarity Unique", 'BaseType == "Leather Belt"'],
});

const FOULBORN_BELT = bucket({
  id: "unique:foulborn/Heavy Belt",
  family: "foulborn",
  verb: "take",
  tier: "T1",
  conditions: ["Foulborn True", "Rarity Unique", 'BaseType == "Heavy Belt"'],
});

const CHAOS_1 = bucket({
  id: "stack:currency/Chaos Orb@1",
  family: "stackables",
  tier: "T3",
  minStack: 1,
  conditions: ['BaseType == "Chaos Orb"', "StackSize >= 1"],
});

const CHAOS_11 = bucket({
  ...CHAOS_1,
  id: "stack:currency/Chaos Orb@11",
  tier: "T2",
  minStack: 11,
  conditions: ['BaseType == "Chaos Orb"', "StackSize >= 11"],
});

const CHAOS_51 = bucket({
  ...CHAOS_1,
  id: "stack:currency/Chaos Orb@51",
  tier: "T1",
  minStack: 51,
  conditions: ['BaseType == "Chaos Orb"', "StackSize >= 51"],
});

const SCRIPTURE = bucket({
  id: "misc:sanctum/The Original Scripture",
  family: "misc",
  tier: "T0",
  conditions: ['BaseType == "The Original Scripture"'],
});

const CHALICE = bucket({
  id: "misc:sanctum/The Gilded Chalice",
  family: "misc",
  tier: "T0",
  conditions: ['BaseType == "The Gilded Chalice"'],
});

const T16_EIGHT_MODS = bucket({
  id: "map:t16 corrupted 8 mods",
  family: "maps",
  tier: "T2",
  members: 0,
  conditions: [
    "MapTier >= 16",
    "Corrupted True",
    "Identified True",
    'HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"',
  ],
});

const T16_CORRUPTED = bucket({
  id: "map:t16 corrupted",
  family: "maps",
  tier: "T5",
  members: 0,
  conditions: ["MapTier >= 16", "Corrupted True", "Identified True"],
});

const T16_PLAIN = bucket({
  id: "map:t16",
  family: "maps",
  tier: "hidden",
  conditions: ["MapTier 16", "Rarity Normal"],
});

/** The blocks, in the order they were emitted, with every comment line dropped. */
const bodies = (text: string): string[] =>
  text
    .split("\n\n")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("#") && line.trim() !== "")
        .join("\n"),
    )
    .filter((chunk) => chunk !== "");

describe("one bucket, one block", () => {
  it("writes the conditions the bucket carries and ends on the note", () => {
    expect(bodies(emitFilter([HEAVY_BELT]))).toEqual([
      [
        "Show",
        "\tRarity Unique",
        '\tBaseType == "Heavy Belt"',
      ].join("\n"),
    ]);
  });

  it("ends the block on its note, which is the block's last line", () => {
    const [block] = parseFilter(emitFilter([HEAVY_BELT]));

    expect(block?.notes.map((one) => `${one.key}=${one.value}`)).toEqual([
      "tier=T0",
      "verb=check",
      "family=uniques-by-base",
    ]);
    expect(block?.freehand).toBe("bucket unique:Heavy Belt");
  });

  it("writes Hide for a hidden bucket and Show for everything else", () => {
    expect(parseFilter(emitFilter([T16_PLAIN]))[0]?.keyword).toBe("Hide");
    expect(parseFilter(emitFilter([SCRIPTURE]))[0]?.keyword).toBe("Show");
  });

  it("passes a condition the classifier wrote through untouched", () => {
    // The eight-modifier trick is derivable from nothing on the bucket. It travels as a
    // line, and the emitter is not allowed to have an opinion about it.
    expect(emitFilter([T16_EIGHT_MODS])).toContain(
      '\tHasExplicitMod >=8 "a" "e" "i" "o" "u" "y"',
    );
  });

  it("refuses a bucket with no conditions, because that block takes the whole floor", () => {
    expect(() => emitFilter([bucket({ id: "misc:x/Nothing" })])).toThrow(
      /misc:x\/Nothing.* no conditions/,
    );
  });
});

describe("the merge", () => {
  it("folds two buckets that differ only in base type into one block", () => {
    const [block, ...rest] = planBlocks([SCRIPTURE, CHALICE]);

    expect(rest).toEqual([]);
    expect(block?.conditions).toEqual([
      'BaseType == "The Original Scripture" "The Gilded Chalice"',
    ]);
    expect(block?.buckets.map((one) => one.id)).toEqual([
      "misc:sanctum/The Original Scripture",
      "misc:sanctum/The Gilded Chalice",
    ]);
  });

  it("keeps the shared conditions in place around the merged one", () => {
    const [block] = planBlocks([HEAVY_BELT, LEATHER_BELT]);

    expect(block?.conditions).toEqual([
      "Rarity Unique",
      'BaseType == "Heavy Belt" "Leather Belt"',
    ]);
  });

  it("will not fold buckets whose tier, verb or family disagree", () => {
    const other = (over: Partial<Bucket>): Bucket => bucket({ ...CHALICE, ...over });

    expect(planBlocks([SCRIPTURE, other({ tier: "T1" })])).toHaveLength(2);
    expect(planBlocks([SCRIPTURE, other({ verb: "check" })])).toHaveLength(2);
    expect(planBlocks([SCRIPTURE, other({ family: "fragments" })])).toHaveLength(2);
  });

  it("will not fold buckets that differ in any condition but the base type", () => {
    // Two rungs of one currency are the same name and a different threshold. Folding them
    // would put the large stack's tier on a single orb.
    expect(planBlocks([CHAOS_11, CHAOS_51])).toHaveLength(2);
  });

  it("folds two names that land on the same rung, because that is one block", () => {
    const same = bucket({
      ...CHAOS_11,
      id: "stack:currency/Divine Orb@11",
      conditions: ['BaseType == "Divine Orb"', "StackSize >= 11"],
    });

    const [block, ...rest] = planBlocks([CHAOS_11, same]);

    expect(rest).toEqual([]);
    expect(block?.conditions).toEqual([
      'BaseType == "Chaos Orb" "Divine Orb"',
      "StackSize >= 11",
    ]);
  });

  it("writes a repeated base type once, and still names both buckets", () => {
    const twin = bucket({ ...SCRIPTURE, id: "misc:other/The Original Scripture" });

    const [block, ...rest] = planBlocks([SCRIPTURE, twin]);

    expect(rest).toEqual([]);
    expect(block?.conditions).toEqual(['BaseType == "The Original Scripture"']);
    // Nothing disappears without being accounted for.
    expect(block?.buckets).toHaveLength(2);
  });

  it("names the first bucket in the note and says how many others share the block", () => {
    expect(emitFilter([SCRIPTURE, CHALICE])).toContain(
      "#@ tier=T0 verb=take family=misc bucket misc:sanctum/The Original Scripture and 1 more",
    );
  });
});

describe("the order blocks come out in", () => {
  it("writes the foulborn block before the plain one on the same base", () => {
    const ids = planBlocks([HEAVY_BELT, FOULBORN_BELT]).map(
      (block) => block.buckets[0]?.id,
    );

    expect(ids).toEqual(["unique:foulborn/Heavy Belt", "unique:Heavy Belt"]);
  });

  it("writes the large stack before the small one, or the small one eats it", () => {
    const ids = planBlocks([CHAOS_1, CHAOS_11, CHAOS_51]).map(
      (block) => block.buckets[0]?.id,
    );

    expect(ids).toEqual([
      "stack:currency/Chaos Orb@51",
      "stack:currency/Chaos Orb@11",
      "stack:currency/Chaos Orb@1",
    ]);
  });

  it("writes the level 21 gem before the level 1 one when both are quality 23", () => {
    // Both blocks have four conditions and both peak at 23, so the largest number in each
    // ties them. The level is the whole difference between the two, and a level 1 block
    // takes every gem of that name — including the level 21 the other block was for.
    const gem = (level: number, tier: Bucket["tier"]): Bucket =>
      bucket({
        id: `gem:Kinetic Fusillade lvl${level} q23 corrupted`,
        family: "gems",
        tier,
        conditions: [
          'BaseType == "Kinetic Fusillade"',
          `GemLevel >= ${level}`,
          "Quality >= 23",
          "Corrupted True",
        ],
      });

    const ids = planBlocks([gem(1, "T1"), gem(21, "T2")]).map(
      (block) => block.buckets[0]?.id,
    );

    expect(ids).toEqual([
      "gem:Kinetic Fusillade lvl21 q23 corrupted",
      "gem:Kinetic Fusillade lvl1 q23 corrupted",
    ]);
  });

  it("puts a block that asks about a number above one that says nothing about it", () => {
    // No constraint is weaker than any threshold, however small the threshold is.
    const gated = bucket({
      id: "stack:currency/Orb@1",
      family: "stackables",
      conditions: ['BaseType == "Orb"', "StackSize >= 1"],
    });
    const loose = bucket({
      id: "stack:currency/Orb",
      family: "stackables",
      verb: "check",
      conditions: ['BaseType == "Orb"'],
    });

    expect(planBlocks([loose, gated]).map((block) => block.buckets[0]?.id)).toEqual([
      "stack:currency/Orb@1",
      "stack:currency/Orb",
    ]);
  });

  it("writes the most conditioned map variant first", () => {
    const ids = planBlocks([T16_CORRUPTED, T16_EIGHT_MODS]).map(
      (block) => block.buckets[0]?.id,
    );

    expect(ids).toEqual(["map:t16 corrupted 8 mods", "map:t16 corrupted"]);
  });

  it("orders the same buckets the same way whatever order they arrived in", () => {
    const forwards = planBlocks([CHAOS_1, CHAOS_11, CHAOS_51, HEAVY_BELT]);
    const backwards = planBlocks([HEAVY_BELT, CHAOS_51, CHAOS_11, CHAOS_1]);

    expect(backwards.map((block) => block.conditions)).toEqual(
      forwards.map((block) => block.conditions),
    );
  });
});

describe("the file as a whole", () => {
  const ALL = [
    HEAVY_BELT,
    LEATHER_BELT,
    FOULBORN_BELT,
    CHAOS_1,
    CHAOS_11,
    CHAOS_51,
    SCRIPTURE,
    CHALICE,
    T16_EIGHT_MODS,
    T16_CORRUPTED,
    T16_PLAIN,
  ];

  it("parses, which is the first half of being a filter at all", () => {
    expect(parseFilter(emitFilter(ALL))).toHaveLength(planBlocks(ALL).length);
  });

  it("puts every bucket in exactly one block", () => {
    const written = planBlocks(ALL).flatMap((block) => block.buckets.map((one) => one.id));

    expect([...written].sort()).toEqual([...ALL.map((one) => one.id)].sort());
  });

  it("names every bucket it wrote in a comment above the block that serves it", () => {
    const text = emitFilter(ALL);

    for (const one of ALL) expect(text).toContain(`# bucket ${one.id} —`);
  });

  it("says what a block is worth beside the bucket that decided it", () => {
    expect(emitFilter([HEAVY_BELT])).toContain(
      "# bucket unique:Heavy Belt — 8 members, floor 1c, ceiling 32988c, ev 9896c, set by Mageblood 33kc",
    );
  });

  it("counts one member as one member", () => {
    expect(emitFilter([SCRIPTURE])).toContain(
      "# bucket misc:sanctum/The Original Scripture — 1 member, ",
    );
  });

  it("says a bucket nothing priced is unpriced rather than worth nothing", () => {
    expect(emitFilter([T16_CORRUPTED])).toContain("# bucket map:t16 corrupted — unpriced");
  });

  it("carries the stamp and the counts in the header", () => {
    const text = emitFilter(ALL, "Allflame, divine 552c");

    expect(text).toContain("Allflame, divine 552c");
    expect(text).toContain(`${ALL.length} buckets`);
    expect(text).toContain(`${planBlocks(ALL).length} blocks`);
  });

  it("means the same thing with every comment stripped out of it", () => {
    // The point of putting nothing in a comment that the validator reads: what the game
    // runs and what was checked are the same file.
    const kept = emitFilter(ALL)
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n");

    expect(kept).not.toContain("#@");
    expect(bodies(kept)).toEqual(bodies(emitFilter(ALL)));
  });

  it("writes nothing but a header when there are no buckets", () => {
    expect(bodies(emitFilter([]))).toEqual([]);
  });
});
