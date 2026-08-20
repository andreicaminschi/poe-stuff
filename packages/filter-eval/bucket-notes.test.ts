import { describe, it, expect } from "@jest/globals";
import { evaluateFilter } from "./evaluate-filter.ts";
import { formatNote } from "./format-note.ts";
import { parseFilter } from "./parse-filter.ts";
import { APPLY_KEYS } from "./filter-ast.ts";
import type { ApplyKey, FilterItem } from "./filter-ast.ts";

/**
 * The note vocabulary, against the buckets that actually exist.
 *
 * Taken from `packages/filter/buckets-draft.json` on 2026-08-20: 4580 buckets, which use
 * 56 distinct `family`/`verb`/`tier` combinations between them. They are written out here
 * rather than read off disk, because that file is a build artefact of another package and
 * this one stands alone.
 *
 * These fail the day the classifier starts emitting a word `APPLY_KEYS` has never heard of,
 * which is the drift worth being told about — a filter carrying an unknown tier does not
 * load at all.
 */

type Triple = { family: string; verb: string; tier: string; buckets: number };

const TRIPLES: readonly Triple[] = [
  { family: "div-cards", verb: "take", tier: "T0", buckets: 11 },
  { family: "div-cards", verb: "take", tier: "T1", buckets: 24 },
  { family: "div-cards", verb: "take", tier: "T2", buckets: 38 },
  { family: "div-cards", verb: "take", tier: "T3", buckets: 122 },
  { family: "div-cards", verb: "take", tier: "hidden", buckets: 256 },
  { family: "foulborn", verb: "check", tier: "T0", buckets: 6 },
  { family: "foulborn", verb: "check", tier: "T1", buckets: 4 },
  { family: "foulborn", verb: "check", tier: "T2", buckets: 2 },
  { family: "foulborn", verb: "check", tier: "T3", buckets: 5 },
  { family: "foulborn", verb: "gamble", tier: "T5", buckets: 2 },
  { family: "foulborn", verb: "take", tier: "T0", buckets: 4 },
  { family: "foulborn", verb: "take", tier: "T1", buckets: 13 },
  { family: "foulborn", verb: "take", tier: "T2", buckets: 10 },
  { family: "foulborn", verb: "take", tier: "T3", buckets: 49 },
  { family: "foulborn", verb: "take", tier: "T5", buckets: 75 },
  { family: "fragments", verb: "take", tier: "T0", buckets: 1 },
  { family: "fragments", verb: "take", tier: "T1", buckets: 6 },
  { family: "fragments", verb: "take", tier: "T2", buckets: 6 },
  { family: "fragments", verb: "take", tier: "T3", buckets: 1 },
  { family: "fragments", verb: "take", tier: "T5", buckets: 1 },
  { family: "gems", verb: "take", tier: "T0", buckets: 27 },
  { family: "gems", verb: "take", tier: "T1", buckets: 133 },
  { family: "gems", verb: "take", tier: "T2", buckets: 320 },
  { family: "gems", verb: "take", tier: "T3", buckets: 566 },
  { family: "gems", verb: "take", tier: "T5", buckets: 887 },
  { family: "gems", verb: "take", tier: "varies", buckets: 202 },
  { family: "maps", verb: "check", tier: "T2", buckets: 1 },
  { family: "maps", verb: "take", tier: "T2", buckets: 2 },
  { family: "maps", verb: "take", tier: "T3", buckets: 5 },
  { family: "maps", verb: "take", tier: "T4", buckets: 1 },
  { family: "maps", verb: "take", tier: "T5", buckets: 2 },
  { family: "maps", verb: "take", tier: "hidden", buckets: 20 },
  { family: "misc", verb: "take", tier: "T0", buckets: 2 },
  { family: "misc", verb: "take", tier: "T1", buckets: 6 },
  { family: "misc", verb: "take", tier: "T2", buckets: 7 },
  { family: "misc", verb: "take", tier: "T3", buckets: 34 },
  { family: "misc", verb: "take", tier: "hidden", buckets: 256 },
  { family: "stackables", verb: "take", tier: "T0", buckets: 63 },
  { family: "stackables", verb: "take", tier: "T1", buckets: 192 },
  { family: "stackables", verb: "take", tier: "T2", buckets: 293 },
  { family: "stackables", verb: "take", tier: "T3", buckets: 423 },
  { family: "stackables", verb: "take", tier: "hidden", buckets: 69 },
  { family: "stackables", verb: "take", tier: "varies", buckets: 5 },
  { family: "unique-maps", verb: "check", tier: "varies", buckets: 1 },
  { family: "uniques-by-base", verb: "check", tier: "T0", buckets: 1 },
  { family: "uniques-by-base", verb: "check", tier: "T1", buckets: 2 },
  { family: "uniques-by-base", verb: "check", tier: "T2", buckets: 7 },
  { family: "uniques-by-base", verb: "check", tier: "T3", buckets: 26 },
  { family: "uniques-by-base", verb: "check", tier: "hidden", buckets: 7 },
  { family: "uniques-by-base", verb: "gamble", tier: "T3", buckets: 4 },
  { family: "uniques-by-base", verb: "gamble", tier: "hidden", buckets: 114 },
  { family: "uniques-by-base", verb: "take", tier: "T0", buckets: 1 },
  { family: "uniques-by-base", verb: "take", tier: "T1", buckets: 5 },
  { family: "uniques-by-base", verb: "take", tier: "T2", buckets: 65 },
  { family: "uniques-by-base", verb: "take", tier: "T3", buckets: 158 },
  { family: "uniques-by-base", verb: "take", tier: "hidden", buckets: 37 },
];

/**
 * Every `conditions` array that is not empty in the whole bucket file. Five of 4580 — the
 * classifier does not write conditions yet, so a block cannot be generated from a bucket
 * today. These are what exists, and they have to parse.
 */
const BUCKET_CONDITIONS: readonly { id: string; conditions: readonly string[] }[] = [
  {
    id: "map:t16 corrupted 8 mods",
    conditions: [
      "Corrupted True",
      "Identified True",
      'HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"',
    ],
  },
  { id: "map:t16 corrupted unidentified", conditions: ["Corrupted True", "Identified False"] },
  { id: "map:t16 corrupted", conditions: ["Corrupted True", "Identified True"] },
  { id: "map:t16 originator", conditions: ["HasImplicitMod True"] },
  {
    id: "map:t16 originator corrupted",
    conditions: ["Corrupted True", "HasImplicitMod True"],
  },
];

/** A block carrying one bucket's note, with a condition every item below satisfies. */
const blockFor = (triple: Triple, freehand = ""): string =>
  ["Show", '\tBaseType == "Gold"', `\t${formatNote(notesOf(triple), freehand)}`].join("\n");

const notesOf = (triple: Triple): Partial<Record<ApplyKey, string>> => ({
  tier: triple.tier as string,
  verb: triple.verb as string,
  family: triple.family as string,
});

const GOLD: FilterItem = { BaseType: "Gold", StackSize: 200 };

describe("the note vocabulary, against real buckets", () => {
  it("covers every family, verb and tier the 4580 buckets use", () => {
    const missing: string[] = [];

    for (const { family, verb, tier } of TRIPLES) {
      if (!(APPLY_KEYS.family as readonly string[]).includes(family)) {
        missing.push(`family=${family}`);
      }
      if (!(APPLY_KEYS.verb as readonly string[]).includes(verb)) missing.push(`verb=${verb}`);
      if (!(APPLY_KEYS.tier as readonly string[]).includes(tier)) missing.push(`tier=${tier}`);
    }

    expect(missing).toEqual([]);
  });

  it("writes and reads back a note for each of the 56 combinations", () => {
    for (const triple of TRIPLES) {
      const result = evaluateFilter(parseFilter(blockFor(triple)), GOLD);

      expect(result.verdict).toBe("Show");
      expect(result.notes).toEqual(notesOf(triple));
    }
  });

  it("writes the same line every time, keys in one order", () => {
    // Two generated filters can be compared as text, so key order cannot wander.
    expect(formatNote({ verb: "take", tier: "T1", family: "gems" })).toBe(
      "#@ tier=T1 verb=take family=gems",
    );
    expect(formatNote({ family: "gems", tier: "T1", verb: "take" })).toBe(
      "#@ tier=T1 verb=take family=gems",
    );
  });

  it("carries a bucket id in the freehand, where the format cannot hold it", () => {
    // Bucket ids look like `stack:currency/Mirror of Kalandra@1` — colons, slashes, spaces
    // and an @. None of that fits a note value, so it goes in the freehand.
    const id = "stack:currency/Mirror of Kalandra@1";
    const triple: Triple = { family: "stackables", verb: "take", tier: "T0", buckets: 63 };

    const [block] = parseFilter(blockFor(triple, `bucket ${id}`));

    expect(block?.freehand).toBe(`bucket ${id}`);
    expect(block?.notes.map((note) => `${note.key}=${note.value}`)).toEqual([
      "tier=T0",
      "verb=take",
      "family=stackables",
    ]);
  });

  it("refuses to write a note for a bucket whose tier is not a tier", () => {
    expect(() => formatNote({ tier: "T9", verb: "take" })).toThrow(
      /cannot write a #@ note: tier takes one of .*got "T9"/,
    );
  });

  it("refuses to write a note for a bucket with no verb", () => {
    expect(() => formatNote({ tier: "T1" })).toThrow(
      /cannot write a #@ note: a note needs tier and verb, and this one has no verb/,
    );
  });

  it("refuses freehand that the reader would take for a botched pair", () => {
    expect(() => formatNote({ tier: "T1", verb: "take" }, "id=gold")).toThrow(
      /freehand cannot start with "id=gold", because it looks like a pair/,
    );
  });

  it("names the APPLY_KEYS values no bucket has ever used", () => {
    // Not a failure. It records that two families are declared and unreached, so nobody
    // deletes them thinking they are dead, and nobody is surprised when one shows up.
    const used = new Set(TRIPLES.map((triple) => triple.family));
    const unused = APPLY_KEYS.family.filter((family) => !used.has(family));

    expect(unused).toEqual(["bases", "corruptible-uniques"]);
  });
});

describe("the conditions real buckets carry", () => {
  it("parses every conditions array in the bucket file", () => {
    for (const bucket of BUCKET_CONDITIONS) {
      const generated = [
        "Show",
        ...bucket.conditions.map((condition) => `\t${condition}`),
        `\t${formatNote({ tier: "T1", verb: "take", family: "maps" }, `bucket ${bucket.id}`)}`,
      ].join("\n");

      const [block] = parseFilter(generated);

      expect(block?.conditions).toHaveLength(bucket.conditions.length);
      expect(block?.freehand).toBe(`bucket ${bucket.id}`);
    }
  });

  it("matches the t16 corrupted map the conditions were written for", () => {
    const bucket = BUCKET_CONDITIONS[2];
    const generated = [
      "Show",
      ...(bucket?.conditions ?? []).map((condition) => `\t${condition}`),
      `\t${formatNote({ tier: "T1", verb: "take", family: "maps" })}`,
    ].join("\n");

    const corrupted: FilterItem = { Corrupted: true, Identified: true };

    expect(evaluateFilter(parseFilter(generated), corrupted).notes).toEqual({
      tier: "T1",
      verb: "take",
      family: "maps",
    });
    expect(
      evaluateFilter(parseFilter(generated), { ...corrupted, Identified: false }).verdict,
    ).toBe("none");
  });

  it("counts the eight-mod map the way that bucket means it", () => {
    // `HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"` counts vowels present across the mod
    // names, which is how that bucket approximates "this map has a lot of text on it".
    const generated = [
      "Show",
      '\tHasExplicitMod >=4 "a" "e" "i" "o" "u" "y"',
      `\t${formatNote({ tier: "T1", verb: "take", family: "maps" })}`,
    ].join("\n");

    const wordy: FilterItem = {
      HasExplicitMod: ["Magmatic", "Serpentine", "Ionising", "Buoyant", "Cryptic"],
    };
    const terse: FilterItem = { HasExplicitMod: ["Rgh"] };

    expect(evaluateFilter(parseFilter(generated), wordy).verdict).toBe("Show");
    expect(evaluateFilter(parseFilter(generated), terse).verdict).toBe("none");
  });
});

describe("what a bucket cannot yet be turned into", () => {
  it("records that only five of 4580 buckets carry any conditions", () => {
    // The gap is upstream: without conditions on a bucket there is nothing to generate a
    // block from, so bucket-to-filter cannot be tested end to end yet. When the classifier
    // starts writing conditions, this number moves and the fixture above grows.
    expect(BUCKET_CONDITIONS).toHaveLength(5);
  });

  it("turns a minStack into the StackSize condition its note describes", () => {
    // A stackables bucket carries `minStack: 3` and `note: "stack>=3"`. That is the one
    // other field with an obvious filter condition behind it.
    const generated = [
      "Show",
      "\tStackSize >= 3",
      '\tBaseType == "Chaos Orb"',
      `\t${formatNote({ tier: "T2", verb: "take", family: "stackables" }, "note stack>=3")}`,
    ].join("\n");

    const blocks = parseFilter(generated);

    expect(blocks[0]?.freehand).toBe("note stack>=3");
    expect(evaluateFilter(blocks, { BaseType: "Chaos Orb", StackSize: 3 }).verdict).toBe(
      "Show",
    );
    expect(evaluateFilter(blocks, { BaseType: "Chaos Orb", StackSize: 2 }).verdict).toBe(
      "none",
    );
  });

  it("refuses a bucket note field verbatim, because it starts with an = token", () => {
    // The `note` field on a stackables bucket is the string "stack>=3". Handed straight to
    // the freehand it would read as a botched pair, so the generator has to lead with a
    // word — `note stack>=3` above. Worth failing here rather than in the filter.
    expect(() =>
      formatNote({ tier: "T2", verb: "take", family: "stackables" }, "stack>=3"),
    ).toThrow(/freehand cannot start with "stack>=3", because it looks like a pair/);

    // The other real note values have no `=` and go through untouched.
    for (const note of ["5/6 priced", "2/7 priced", "8/8 priced"]) {
      expect(formatNote({ tier: "T2", verb: "take" }, note)).toBe(
        `#@ tier=T2 verb=take ${note}`,
      );
    }
  });
});
