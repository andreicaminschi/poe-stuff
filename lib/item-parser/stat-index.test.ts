import { describe, it, expect } from "@jest/globals";
import { statIndex, statKey } from "./stat-index.ts";

describe("statKey", () => {
  it("writes a spelled-out range and a placeholder the same way", () => {
    expect(statKey("Adds (2-3) to (4-5) Cold Damage")).toBe(statKey("Adds # to # Cold Damage")); // the whole point of the key
  });

  it("drops the plus sign in front of a number and lowers the case", () => {
    expect(statKey("+30 to Dexterity")).toBe("# to dexterity");
  });

  it("reads 'an additional' as a count, matching '# additional' with a plural", () => {
    expect(statKey("Fires an additional Arrow")).toBe(statKey("Fires # additional Arrows")); // article and plural both normalised
  });

  it("collapses a newline and the spaces after it into a single space", () => {
    expect(statKey("x\n  y")).toBe("x y"); // hybrid mods
  });

  it("keeps a lone 'a' that is not followed by additional or extra", () => {
    expect(statKey("a b")).toBe("a b");
  });

  it("keeps the s of 'less' but strips the plural s of 'Charges'", () => {
    expect(statKey("less Charges")).toBe("less charge"); // -ss excluded
  });

  it("keeps the s of 'has'", () => {
    expect(statKey("Area has")).toBe("area has");
  });

  it("gives 'per 10 Dexterity' and 'per 12 Dexterity' the same key", () => {
    expect(statKey("per 10 Dexterity")).toBe(statKey("per 12 Dexterity")); // literal numbers blanked too, by design
  });
});

describe("statIndex", () => {
  it("finds every stat whose text reduces to the same key, in the order they were given", () => {
    const index = statIndex(["+# to Life", "+# to life", "other"], (text) => text);

    const found = index.find("+149 to Life");

    expect(found).toEqual(["+# to Life", "+# to life"]); // duplicates are returned, not collapsed
  });

  it("finds nothing when no stat shares the key", () => {
    const index = statIndex(["a"], (text) => text);

    const found = index.find("b");

    expect(found).toEqual([]);
  });
});
