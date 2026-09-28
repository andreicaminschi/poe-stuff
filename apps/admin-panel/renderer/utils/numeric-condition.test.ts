import { describe, it, expect } from "@jest/globals";
import { numericCondition } from "./numeric-condition.ts";

describe("numericCondition", () => {
  it("knows ItemLevel compares as a number", () => {
    const numeric = numericCondition("ItemLevel");

    expect(numeric).toBe(true); // read from the grammar's registry, not a list here
  });

  it("ignores case and surrounding spaces", () => {
    const numeric = numericCondition("  itemlevel ");

    expect(numeric).toBe(true); // trimmed and lowercased before the lookup
  });

  it("does not treat Rarity as numeric, though it is ordered", () => {
    const numeric = numericCondition("Rarity");

    expect(numeric).toBe(false); // ordered by name, not compared as a number
  });

  it("does not know a name outside the grammar", () => {
    const numeric = numericCondition("Madeup");

    expect(numeric).toBe(false); // unknown names fall through to false, not a throw
  });
});
