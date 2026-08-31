import { describe, it, expect } from "@jest/globals";
import { evaluateFilter } from "./evaluate-filter.ts";
import { parseFilter } from "./parse-filter.ts";
import type { FilterItem } from "./filter-ast.ts";

const filter = (...lines: string[]): string => lines.join("\n");

/** The `#@` line every block has to end with, when the test does not care what it says. */
const NOTE = "\t#@ tier=T1 verb=take";

const evaluate = (text: string, item: FilterItem) => evaluateFilter(parseFilter(text), item);

/** True when the one block in `text` matched, whatever it says. */
const matches = (condition: string, item: FilterItem): boolean =>
  evaluate(filter("Show", `\t${condition}`, NOTE), item).verdict === "Show";

describe("evaluateFilter", () => {
  it("matches a boolean condition against the item and flips it under !", () => {
    expect(matches("Corrupted True", { Corrupted: true })).toBe(true);
    expect(matches("Corrupted True", { Corrupted: false })).toBe(false);
    expect(matches("Corrupted False", { Corrupted: false })).toBe(true);
    expect(matches("Corrupted ! True", { Corrupted: false })).toBe(true);
    expect(matches("Corrupted != True", { Corrupted: true })).toBe(false);
  });

  it("compares a numeric condition with every operator", () => {
    const item: FilterItem = { ItemLevel: 68 };

    expect(matches("ItemLevel 68", item)).toBe(true);
    expect(matches("ItemLevel = 68", item)).toBe(true);
    expect(matches("ItemLevel == 68", item)).toBe(true);
    expect(matches("ItemLevel ! 68", item)).toBe(false);
    expect(matches("ItemLevel != 69", item)).toBe(true);
    expect(matches("ItemLevel < 69", item)).toBe(true);
    expect(matches("ItemLevel <= 68", item)).toBe(true);
    expect(matches("ItemLevel > 68", item)).toBe(false);
    expect(matches("ItemLevel >= 68", item)).toBe(true);
  });

  it("compares an ordered condition along its ladder rather than alphabetically", () => {
    const rare: FilterItem = { Rarity: "Rare" };

    expect(matches("Rarity > Magic", rare)).toBe(true);
    expect(matches("Rarity >= Rare", rare)).toBe(true);
    expect(matches("Rarity < Unique", rare)).toBe(true);
    expect(matches("Rarity Unique", rare)).toBe(false);
    expect(matches("Rarity != Unique", rare)).toBe(true);
    expect(matches("Rarity < Normal", { Rarity: "Normal" })).toBe(false);
    expect(matches("Rarity >= Normal", { Rarity: "Unique" })).toBe(true);
  });

  it("fails an ordered condition when the item holds a value the ladder never heard of", () => {
    expect(matches("Rarity > Magic", { Rarity: "Legendary" })).toBe(false);
  });

  it("matches an ordered condition against any of the values it lists", () => {
    expect(matches("Rarity Normal Magic Rare", { Rarity: "Rare" })).toBe(true);
    expect(matches("Rarity Normal Magic Rare", { Rarity: "Unique" })).toBe(false);
    expect(matches("Rarity Normal Magic", { Rarity: "normal" })).toBe(true);
    expect(matches("Rarity ! Normal Magic", { Rarity: "Rare" })).toBe(true);
    expect(matches("Rarity ! Normal Magic", { Rarity: "Magic" })).toBe(false);
  });

  it("matches an ordered value whole, never as part of another", () => {
    expect(matches("Rarity == Rare", { Rarity: "Rare" })).toBe(true);
    expect(matches("Rarity Rare", { Rarity: "Rare" })).toBe(true);
  });

  it("matches part of the name on = and the whole name on ==", () => {
    const item: FilterItem = { BaseType: "Chaos Orb" };

    expect(matches("BaseType Orb", item)).toBe(true);
    expect(matches("BaseType == Orb", item)).toBe(false);
    expect(matches('BaseType == "Chaos Orb"', item)).toBe(true);
  });

  it("compares text without caring about case", () => {
    expect(matches('BaseType "chaos orb"', { BaseType: "Chaos Orb" })).toBe(true);
    expect(matches('BaseType == "CHAOS ORB"', { BaseType: "Chaos Orb" })).toBe(true);
    expect(matches("Class currency", { Class: "Stackable Currency" })).toBe(true);
  });

  it("matches a text condition when any one of its values matches", () => {
    const item: FilterItem = { BaseType: "Chaos Orb" };

    expect(matches('BaseType "Divine Orb" "Chaos Orb"', item)).toBe(true);
    expect(matches('BaseType "Divine Orb" "Exalted Orb"', item)).toBe(false);
  });

  it("flips a text condition as a whole under !, so no value may match", () => {
    const item: FilterItem = { BaseType: "Chaos Orb" };

    expect(matches("BaseType ! Divine", item)).toBe(true);
    expect(matches("BaseType ! Divine Chaos", item)).toBe(false);
    expect(matches('BaseType != "Chaos Orb"', item)).toBe(false);
  });

  it("matches an enum condition against any influence the item carries", () => {
    const item: FilterItem = { HasInfluence: ["Shaper"] };

    expect(matches("HasInfluence Shaper", item)).toBe(true);
    expect(matches("HasInfluence Elder", item)).toBe(false);
    expect(matches("HasInfluence Elder Shaper", item)).toBe(true);
    expect(matches("HasInfluence ! Elder", item)).toBe(true);
    expect(matches("HasInfluence shaper", item)).toBe(true);
  });

  it("reads HasInfluence None as an item carrying no influence at all", () => {
    expect(matches("HasInfluence None", { HasInfluence: [] })).toBe(true);
    expect(matches("HasInfluence None", { HasInfluence: ["Shaper"] })).toBe(false);
    expect(matches("HasInfluence Shaper", { HasInfluence: [] })).toBe(false);
  });

  it("counts every socket for Sockets, ignoring where the links fall", () => {
    // Two linked groups: a red-green-blue and a pair of blues. Five sockets in total.
    const item: FilterItem = { Sockets: "RGB BB" };

    expect(matches("Sockets >= 5", item)).toBe(true);
    expect(matches("Sockets >= 6", item)).toBe(false);
    expect(matches("Sockets 5", item)).toBe(true);
    expect(matches("Sockets < 1", { Sockets: "" })).toBe(true);
    expect(matches("Sockets < 1", item)).toBe(false);
  });

  it("asks each linked group on its own for SocketGroup", () => {
    const item: FilterItem = { SocketGroup: "RGB BB" };

    // No single group has five sockets, though the item has five.
    expect(matches("SocketGroup >= 5", item)).toBe(false);
    expect(matches("SocketGroup >= 3", item)).toBe(true);
    expect(matches("SocketGroup >= 2", item)).toBe(true);
  });

  it("reads socket colours as at least, so RGB is the chromatic recipe", () => {
    // A group holding one of each, whatever else is in there.
    expect(matches('SocketGroup "RGB"', { SocketGroup: "RGB" })).toBe(true);
    expect(matches('SocketGroup "RGB"', { SocketGroup: "RGBB" })).toBe(true);
    expect(matches('SocketGroup "RGB"', { SocketGroup: "RG B" })).toBe(false);
    expect(matches('SocketGroup "RGB"', { SocketGroup: "RRG" })).toBe(false);
  });

  it("applies the operator to the socket count and at-least to the colours", () => {
    // The syntax doc glosses this one as five or more linked with three or more green.
    expect(matches("SocketGroup >= 5GGG", { SocketGroup: "GGGRB" })).toBe(true);
    expect(matches("SocketGroup >= 5GGG", { SocketGroup: "GGGGRB" })).toBe(true);
    expect(matches("SocketGroup >= 5GGG", { SocketGroup: "GGRRB" })).toBe(false);
    expect(matches("SocketGroup >= 5GGG", { SocketGroup: "GGGR" })).toBe(false);
  });

  it("matches abyss sockets by colour with no count at all", () => {
    expect(matches("Sockets >= AAA", { Sockets: "AAA" })).toBe(true);
    expect(matches("Sockets >= AAA", { Sockets: "RGBAAAA" })).toBe(true);
    expect(matches("Sockets >= AAA", { Sockets: "RGBAA" })).toBe(false);
  });

  it("counts how many of the listed mods the item carries", () => {
    const item: FilterItem = {
      HasExplicitMod: ["Tyrannical Blow", "of Haast", "Merciless Edge"],
    };

    expect(matches('HasExplicitMod >=2 "of Haast" "Tyrannical"', item)).toBe(true);
    expect(matches('HasExplicitMod >=3 "of Haast" "Tyrannical"', item)).toBe(false);
    expect(matches('HasExplicitMod >=1 "of Tzteosh" "Tyrannical"', item)).toBe(true);
  });

  it("matches a mod name as part of the full mod, not the whole of it", () => {
    const item: FilterItem = { HasExplicitMod: ["Tyrannical Blow"] };

    // The sample writes "Elevated " with a trailing space for exactly this reason.
    expect(matches('HasExplicitMod "Tyrannical"', item)).toBe(true);
    expect(matches('HasExplicitMod "tyrannical"', item)).toBe(true);
    expect(matches('HasExplicitMod "Tyrannical "', item)).toBe(true);
    expect(matches('HasExplicitMod "Tyrannically"', item)).toBe(false);
  });

  it("reads a zero count as none of these being present", () => {
    const clean: FilterItem = { HasExplicitMod: ["Tyrannical Blow"] };

    expect(matches('HasExplicitMod =0 "Shining" "Glowing"', clean)).toBe(true);
    expect(matches('HasExplicitMod =0 "Tyrannical"', clean)).toBe(false);
  });

  it("takes a counted line with no count as at least one, and its negation as none", () => {
    const item: FilterItem = { HasExplicitMod: ["Tyrannical Blow"] };

    expect(matches('HasExplicitMod "Tyrannical"', item)).toBe(true);
    expect(matches('HasExplicitMod "Shining"', item)).toBe(false);
    expect(matches('HasExplicitMod ! "Shining"', item)).toBe(true);
    expect(matches('HasExplicitMod ! "Tyrannical"', item)).toBe(false);
  });

  it("counts nothing when the item carries no mods at all", () => {
    expect(matches('HasExplicitMod =0 "Shining"', { HasExplicitMod: [] })).toBe(true);
    expect(matches('HasExplicitMod >=1 "Shining"', { HasExplicitMod: [] })).toBe(false);
  });

  it("reads TransfiguredGem as a flag or as a name", () => {
    const gem: FilterItem = { TransfiguredGem: "Leap Slam of Groundbreaking" };
    const plain: FilterItem = { TransfiguredGem: "" };

    expect(matches("TransfiguredGem True", gem)).toBe(true);
    expect(matches("TransfiguredGem True", plain)).toBe(false);
    expect(matches("TransfiguredGem False", plain)).toBe(true);
    expect(matches('TransfiguredGem "Leap Slam"', gem)).toBe(true);
    expect(matches('TransfiguredGem "Cyclone"', gem)).toBe(false);
    expect(matches('TransfiguredGem == "Leap Slam"', gem)).toBe(false);
  });

  it("fails a condition whose key the item does not hold, negated or not", () => {
    expect(matches("Corrupted True", {})).toBe(false);
    expect(matches("Corrupted ! True", {})).toBe(false);
    expect(matches("ItemLevel < 100", {})).toBe(false);
    expect(matches("BaseType ! Divine", {})).toBe(false);
    expect(matches("HasInfluence ! Shaper", {})).toBe(false);
    expect(matches("Rarity != Unique", {})).toBe(false);
    expect(matches("Sockets < 1", {})).toBe(false);
    expect(matches('HasExplicitMod =0 "Shining"', {})).toBe(false);
    expect(matches("TransfiguredGem False", {})).toBe(false);
  });

  it("needs every condition in a block to match", () => {
    const block = filter("Show", "\tCorrupted True", "\tRarity Unique", NOTE);

    expect(evaluate(block, { Corrupted: true, Rarity: "Unique" }).verdict).toBe("Show");
    expect(evaluate(block, { Corrupted: false, Rarity: "Unique" }).verdict).toBe("none");
  });

  it("stops at the first matching block and reports its keyword", () => {
    const text = filter("Hide", "\tRarity Normal", NOTE, "Show", "\tRarity Unique", NOTE);

    expect(evaluate(text, { Rarity: "Normal" }).verdict).toBe("Hide");
    expect(evaluate(text, { Rarity: "Unique" }).verdict).toBe("Show");
  });

  it("reports Minimal when a Minimal block is what stopped the walk", () => {
    const text = filter("Minimal", "\tRarity Normal", NOTE);

    expect(evaluate(text, { Rarity: "Normal" }).verdict).toBe("Minimal");
  });

  it("keeps walking past a matching block that says Continue", () => {
    const text = filter(
      "Show",
      "\tRarity Unique",
      "\tContinue",
      "\t#@ tier=T3 verb=check family=gems",
      "Hide",
      "\tCorrupted True",
      "\t#@ tier=hidden verb=check",
    );

    const result = evaluate(text, { Rarity: "Unique", Corrupted: true });

    expect(result.verdict).toBe("Hide");
    expect(result.notes).toEqual({ tier: "hidden", verb: "check", family: "gems" });
  });

  it("lets a later block beat an earlier one on the same key", () => {
    const text = filter(
      "Show",
      "\tRarity Unique",
      "\tContinue",
      "\t#@ tier=T3 verb=check family=gems",
      "Show",
      "\tRarity Unique",
      "\t#@ tier=T1 verb=take",
    );

    const result = evaluate(text, { Rarity: "Unique" });

    // tier and verb are overwritten; family is untouched because the later block is silent
    // about it.
    expect(result.notes).toEqual({ tier: "T1", verb: "take", family: "gems" });
  });

  it("keeps every contribution in order, tagged with the block that made it", () => {
    const text = filter(
      "Show",
      "\tRarity Unique",
      "\tContinue",
      "\t#@ tier=T3 verb=check",
      "Show",
      "\tRarity Unique",
      "\t#@ tier=T1 verb=take",
    );

    const result = evaluate(text, { Rarity: "Unique" });

    expect(result.contributions).toEqual([
      { key: "tier", value: "T3", line: 1 },
      { key: "verb", value: "check", line: 1 },
      { key: "tier", value: "T1", line: 5 },
      { key: "verb", value: "take", line: 5 },
    ]);
  });

  it("lists each block that matched, in order, with its freehand", () => {
    const text = filter(
      "Show",
      "\tRarity Unique",
      "\tContinue",
      "\t#@ tier=T3 verb=check first pass",
      "Show",
      "\tRarity Unique",
      "\t#@ tier=T1 verb=take",
    );

    expect(evaluate(text, { Rarity: "Unique" }).matched).toEqual([
      { line: 1, keyword: "Show", freehand: "first pass" },
      { line: 5, keyword: "Show", freehand: "" },
    ]);
  });

  it("skips the notes of a block that did not match", () => {
    const text = filter(
      "Show",
      "\tCorrupted True",
      "\tContinue",
      "\t#@ tier=T0 verb=take",
      "Show",
      "\tRarity Unique",
      "\t#@ tier=T1 verb=check",
    );

    const result = evaluate(text, { Corrupted: false, Rarity: "Unique" });

    expect(result.notes).toEqual({ tier: "T1", verb: "check" });
    expect(result.matched).toHaveLength(1);
  });

  it("answers none when nothing matched", () => {
    const result = evaluate(filter("Show", "\tRarity Unique", NOTE), { Rarity: "Normal" });

    expect(result.verdict).toBe("none");
    expect(result.notes).toEqual({});
    expect(result.contributions).toEqual([]);
    expect(result.matched).toEqual([]);
  });

  it("answers none when the last matching block still says Continue", () => {
    const text = filter("Show", "\tRarity Unique", "\tContinue", NOTE);
    const result = evaluate(text, { Rarity: "Unique" });

    expect(result.verdict).toBe("none");
    expect(result.notes).toEqual({ tier: "T1", verb: "take" });
  });

  it("handles the worked example from the plan", () => {
    const text = filter("Show", "\tFoulborn True", "\tRarity Unique", "\t#@ tier=T1 verb=take");

    const result = evaluate(text, { Foulborn: true, Rarity: "Unique" });

    expect(result.verdict).toBe("Show");
    expect(result.notes).toEqual({ tier: "T1", verb: "take" });
  });
});
