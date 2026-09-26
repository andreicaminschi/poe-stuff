import { describe, it, expect } from "@jest/globals";
import { hasPairs, isFlagLine, parseProperty, parseSockets, suffixedMod } from "./parse-properties.ts";

describe("isFlagLine", () => {
  it("accepts a line of four words", () => {
    expect(isFlagLine("Foil Unique (Cobalt) Extra")).toBe(true);
  });

  it("rejects a line of five words", () => {
    expect(isFlagLine("one two three four five")).toBe(false);
  });

  it("rejects a short line ending in sentence punctuation", () => {
    expect(isFlagLine("Corrupted.")).toBe(false);
  });
});

describe("suffixedMod", () => {
  it("splits a lowercase bracketed suffix off the modifier text", () => {
    expect(suffixedMod("Allocates Discipline and Training (enchant)")).toEqual({
      text: "Allocates Discipline and Training",
      kind: "enchant",
    });
  });

  it("ignores a capitalised bracket", () => {
    expect(suffixedMod("Foil Unique (Cobalt)")).toBeUndefined();
  });
});

describe("hasPairs", () => {
  it("is true when any line is a key-value pair", () => {
    expect(hasPairs(["Corrupted", "Item Level: 85"])).toBe(true);
  });

  it("is false when a colon follows a key with digits or commas", () => {
    expect(hasPairs(["Maps can, sometimes: be used", "Level 3: x"])).toBe(false);
  });
});

describe("parseProperty", () => {
  it("returns undefined for a line with no key", () => {
    expect(parseProperty("Corrupted")).toBeUndefined();
  });

  it("strips the augmented marker into a flag and keeps the number", () => {
    expect(parseProperty("Chance to Block: 47% (augmented)")).toEqual({
      name: "Chance to Block",
      value: "47%",
      qualifier: "",
      augmented: true,
      unmet: false,
      numbers: [47],
    });
  });

  it("strips the unmet marker into a flag", () => {
    const parsed = parseProperty("Level: 72 (unmet)");

    expect([parsed?.value, parsed?.unmet, parsed?.augmented]).toEqual(["72", true, false]);
  });

  it("splits a bracketed qualifier off the key", () => {
    const parsed = parseProperty("Quality (Attribute Modifiers): +20%");

    expect([parsed?.name, parsed?.qualifier, parsed?.numbers]).toEqual(["Quality", "Attribute Modifiers", [20]]);
  });

  it("reads thousands commas as part of one number", () => {
    expect(parseProperty("Stack Size: 1,234/5,000")?.numbers).toEqual([1234, 5000]);
  });

  it("reads negative and decimal numbers", () => {
    expect(parseProperty("Range: -1.5 to 2.25")?.numbers).toEqual([-1.5, 2.25]);
  });

  it("keeps an empty value when nothing follows the colon", () => {
    expect(parseProperty("Requirements:")).toEqual({
      name: "Requirements",
      value: "",
      qualifier: "",
      augmented: false,
      unmet: false,
      numbers: [],
    });
  });
});

describe("parseSockets", () => {
  it("joins linked sockets and splits unlinked groups", () => {
    expect(parseSockets("R-G-B B-B")).toEqual(["RGB", "BB"]);
  });

  it("reads three unlinked sockets as three groups", () => {
    expect(parseSockets("D D D")).toEqual(["D", "D", "D"]);
  });

  it("ignores stray whitespace", () => {
    expect(parseSockets(" W-W-W ")).toEqual(["WWW"]);
  });

  it("returns no groups for an empty value", () => {
    expect(parseSockets("")).toEqual([]);
  });
});
