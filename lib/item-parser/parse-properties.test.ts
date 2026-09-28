import { describe, it, expect } from "@jest/globals";
import { hasPairs, isFlagLine, parseProperty, parseSockets, suffixedMod } from "./parse-properties.ts";

describe("isFlagLine", () => {
  it("accepts a line of four words", () => {
    expect(isFlagLine("Foil Unique (Cobalt) Extra")).toBe(true); // at the limit
  });

  it("refuses a line of five words", () => {
    expect(isFlagLine("one two three four five")).toBe(false); // one past the limit
  });

  it("refuses a one-word line ending in a full stop", () => {
    expect(isFlagLine("Corrupted.")).toBe(false); // punctuation makes it prose
  });
});

describe("suffixedMod", () => {
  it("splits a lower-case bracketed word off the end as the modifier's kind", () => {
    const result = suffixedMod("Allocates Discipline and Training (enchant)");

    expect(result).toEqual({ text: "Allocates Discipline and Training", kind: "enchant" });
  });

  it("ignores a bracketed word with a capital letter", () => {
    expect(suffixedMod("Foil Unique (Cobalt)")).toBeUndefined(); // lower case only
  });
});

describe("hasPairs", () => {
  it("is true when one of the lines is a key and value", () => {
    expect(hasPairs(["Corrupted", "Item Level: 85"])).toBe(true);
  });

  it("is false when the only colons follow text with commas or digits", () => {
    expect(hasPairs(["Maps can, sometimes: be used", "Level 3: x"])).toBe(false); // keys are letters and spaces only
  });
});

describe("parseProperty", () => {
  it("reads nothing from a line with no colon", () => {
    expect(parseProperty("Corrupted")).toBeUndefined();
  });

  it("takes the augmented marker off the value, sets it as a flag, and keeps the number", () => {
    const parsed = parseProperty("Chance to Block: 47% (augmented)");

    expect(parsed).toEqual({ name: "Chance to Block", value: "47%", qualifier: "", augmented: true, unmet: false, numbers: [47] });
  });

  it("takes the unmet marker off the value and sets it as a flag", () => {
    const parsed = parseProperty("Level: 72 (unmet)");

    expect([parsed?.value, parsed?.unmet, parsed?.augmented]).toEqual(["72", true, false]);
  });

  it("splits a bracketed qualifier off the key", () => {
    const parsed = parseProperty("Quality (Attribute Modifiers): +20%");

    expect([parsed?.name, parsed?.qualifier, parsed?.numbers]).toEqual(["Quality", "Attribute Modifiers", [20]]);
  });

  it("reads 1,234 as one number, not two", () => {
    const parsed = parseProperty("Stack Size: 1,234/5,000");

    expect(parsed?.numbers).toEqual([1234, 5000]); // comma between digits is a thousands separator
  });

  it("reads negative and decimal numbers", () => {
    const parsed = parseProperty("Range: -1.5 to 2.25");

    expect(parsed?.numbers).toEqual([-1.5, 2.25]);
  });

  it("keeps an empty value when nothing follows the colon", () => {
    const parsed = parseProperty("Requirements:");

    expect(parsed).toEqual({ name: "Requirements", value: "", qualifier: "", augmented: false, unmet: false, numbers: [] });
  });
});

describe("parseSockets", () => {
  it("joins linked sockets and splits the groups at spaces", () => {
    expect(parseSockets("R-G-B B-B")).toEqual(["RGB", "BB"]);
  });

  it("reads three unlinked sockets as three groups", () => {
    expect(parseSockets("D D D")).toEqual(["D", "D", "D"]);
  });

  it("ignores spaces before and after the sockets", () => {
    expect(parseSockets(" W-W-W ")).toEqual(["WWW"]); // the game leaves a trailing space
  });

  it("gives no groups for an empty value", () => {
    expect(parseSockets("")).toEqual([]);
  });
});
