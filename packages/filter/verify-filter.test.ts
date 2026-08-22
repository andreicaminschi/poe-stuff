import { describe, it, expect } from "@jest/globals";
import { emitFilter } from "./emit-filter.ts";
import { probeItem, verifyFilter } from "./verify-filter.ts";
import type { Bucket } from "./types.ts";

/**
 * Does the file still say what the buckets said?
 *
 * The emitter merges blocks and guesses at an order. Neither of those is safe on its own: a
 * block written too early eats the item a later one was for, and nothing about the block
 * itself says so. This is the check that makes the guess a guarantee — every bucket goes
 * back through the finished file as an item, and either it comes out on its own tier and
 * verb or it is named as a conflict.
 *
 * An item is built out of the bucket's own conditions, so the probe cannot drift from what
 * the block asks for: they are the same lines, read forwards and backwards.
 */

const BLANK: Bucket = {
  id: "",
  family: "misc",
  verb: "take",
  tier: "T3",
  upTo: "T3",
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

/**
 * A bucket, with only the fields a test cares about spelled out.
 *
 * `upTo` follows `tier` unless a case sets it, because on everything but a unique check the
 * two are the same rung — and a fixture that overrode one and not the other would emit an
 * `upto=` note it never meant to ask for.
 */
const bucket = (over: Partial<Bucket>): Bucket => {
  const merged = { ...BLANK, ...over };

  return { ...merged, upTo: over.upTo ?? merged.tier };
};

const check = (buckets: readonly Bucket[]) => verifyFilter(buckets, emitFilter(buckets));

describe("probeItem", () => {
  it("reads a base type and a rarity straight off the line", () => {
    expect(probeItem(["Rarity Unique", 'BaseType == "Heavy Belt"'])).toEqual({
      Rarity: "Unique",
      BaseType: "Heavy Belt",
    });
  });

  it("takes the threshold itself for >=, and one past it for >", () => {
    expect(probeItem(["StackSize >= 11"])).toEqual({ StackSize: 11 });
    expect(probeItem(["StackSize > 11"])).toEqual({ StackSize: 12 });
    expect(probeItem(["StackSize < 11"])).toEqual({ StackSize: 10 });
    expect(probeItem(["StackSize 11"])).toEqual({ StackSize: 11 });
  });

  it("answers a boolean with the boolean it asked for", () => {
    expect(probeItem(["Corrupted True"])).toEqual({ Corrupted: true });
    expect(probeItem(["Corrupted False"])).toEqual({ Corrupted: false });
  });

  it("walks the rarity ladder for a comparison rather than a name", () => {
    expect(probeItem(["Rarity > Magic"])).toEqual({ Rarity: "Rare" });
    expect(probeItem(["Rarity <= Magic"])).toEqual({ Rarity: "Magic" });
  });

  it("builds a socket run long enough and coloured enough", () => {
    // The count is the operator's, the colours are always at least.
    expect(probeItem(["Sockets >= 5GGG"])?.Sockets).toMatch(/^GGG[RGBADW]{2}$/);
    expect(probeItem(["SocketGroup >= 3RGB"])?.SocketGroup).toBe("RGB");
  });

  it("hands a counted condition as many named mods as it wants", () => {
    expect(probeItem(['HasExplicitMod >=2 "of Haast" "of Tzteosh"'])).toEqual({
      HasExplicitMod: ["of Haast", "of Tzteosh"],
    });
  });

  it("gives an enum a list, and an empty one where None is what was asked", () => {
    expect(probeItem(["HasInfluence Shaper"])).toEqual({ HasInfluence: ["Shaper"] });
    expect(probeItem(["HasInfluence None"])).toEqual({ HasInfluence: [] });
  });

  it("names the transfiguration a transfigured gem block asks for", () => {
    expect(probeItem(['TransfiguredGem "Ice Nova of Frostbolts"'])).toEqual({
      TransfiguredGem: "Ice Nova of Frostbolts",
    });
    expect(probeItem(["TransfiguredGem True"])?.TransfiguredGem).not.toBe("");
  });

  it("gives up on a line no item can satisfy rather than inventing one", () => {
    // Six names cannot be eight modifiers. This is the eight-modifier map, and it is the
    // evaluator that cannot express it — see `TODO.md`.
    expect(probeItem(['HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"'])).toBeUndefined();
  });

  it("gives up when two lines of one block contradict each other", () => {
    expect(probeItem(["GemLevel >= 21", "GemLevel <= 5"])).toBeUndefined();
  });
});

describe("a filter that says what its buckets said", () => {
  it("passes a stack ladder, where every rung also matches the rungs below it", () => {
    const rung = (stack: number, tier: Bucket["tier"]): Bucket =>
      bucket({
        id: `stack:currency/Chaos Orb@${stack}`,
        family: "stackables",
        tier,
        minStack: stack,
        conditions: ['BaseType == "Chaos Orb"', `StackSize >= ${stack}`],
      });

    expect(check([rung(1, "T3"), rung(11, "T2"), rung(51, "T1")])).toEqual([]);
  });

  it("passes a foulborn bucket sitting over the plain one on the same base", () => {
    const plain = bucket({
      id: "unique:Heavy Belt",
      family: "uniques-by-base",
      verb: "check",
      tier: "T0",
      conditions: ["Rarity Unique", 'BaseType == "Heavy Belt"'],
    });
    const foulborn = bucket({
      id: "unique:foulborn/Heavy Belt",
      family: "foulborn",
      tier: "T1",
      conditions: ["Foulborn True", "Rarity Unique", 'BaseType == "Heavy Belt"'],
    });

    expect(check([plain, foulborn])).toEqual([]);
  });

  it("passes a merged block, once for each bucket folded into it", () => {
    const one = bucket({ id: "misc:a/One", conditions: ['BaseType == "One"'] });
    const two = bucket({ id: "misc:a/Two", conditions: ['BaseType == "Two"'] });

    expect(check([one, two])).toEqual([]);
  });
});

describe("what it reports when the filter does not", () => {
  it("names a bucket an earlier block ate, and the block that ate it", () => {
    // Two buckets, the same white tier 16, opposite tiers. No order satisfies both — this
    // is the blighted-map fusion in `classify.ts`, and the point is that it is reported
    // rather than resolved.
    const loud = bucket({
      id: "map:tier16 frame0",
      family: "maps",
      tier: "T3",
      conditions: ["MapTier 16", "Rarity Normal"],
    });
    const quiet = bucket({
      id: "map:t16",
      family: "maps",
      tier: "hidden",
      conditions: ["MapTier 16", "Rarity Normal"],
    });

    const [conflict, ...rest] = check([loud, quiet]);

    expect(rest).toEqual([]);
    expect(conflict?.bucket).toBe("map:t16");
    expect(conflict?.reason).toBe("shadowed");
    expect(conflict?.expected).toBe("hidden take maps");
    expect(conflict?.got).toBe("T3 take maps");
    expect(conflict?.by).toBe("bucket map:tier16 frame0");
  });

  it("names a bucket no item can reach, without calling it a wrong tier", () => {
    const eight = bucket({
      id: "map:t16 corrupted 8 mods",
      family: "maps",
      tier: "T2",
      conditions: [
        "MapTier >= 16",
        "Corrupted True",
        "Identified True",
        'HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"',
      ],
    });

    const [conflict, ...rest] = check([eight]);

    expect(rest).toEqual([]);
    expect(conflict?.reason).toBe("unprobeable");
    expect(conflict?.bucket).toBe("map:t16 corrupted 8 mods");
  });

  it("names a bucket the file answers for with nothing at all", () => {
    // A filter that does not contain the bucket it is being checked against.
    const missing = bucket({ id: "misc:a/Absent", conditions: ['BaseType == "Absent"'] });
    const present = bucket({ id: "misc:a/Here", conditions: ['BaseType == "Here"'] });

    const [conflict] = verifyFilter([missing], emitFilter([present]));

    expect(conflict?.reason).toBe("missed");
    expect(conflict?.got).toBe("nothing");
  });

  it("catches a block written in the wrong order, which is what the ordering rule risks", () => {
    // The general block first, by hand. The specific one below it never fires.
    const general = bucket({
      id: "misc:a/General",
      tier: "T5",
      conditions: ['BaseType == "Orb"'],
    });
    const specific = bucket({
      id: "misc:a/Specific",
      tier: "T0",
      conditions: ['BaseType == "Orb"', "Corrupted True"],
    });
    const wrong = [emitFilter([general]), emitFilter([specific])].join("\n");

    const conflicts = verifyFilter([general, specific], wrong);

    expect(conflicts.map((one) => one.bucket)).toEqual(["misc:a/Specific"]);
    expect(conflicts[0]?.got).toBe("T5 take misc");
  });
});
