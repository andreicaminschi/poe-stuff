import { describe, it, expect } from "@jest/globals";
import { conditionOptions } from "./condition-options.ts";

describe("conditionOptions", () => {
  it("offers the PoE1 filter conditions with nothing used", () => {
    expect(conditionOptions([], "")).toEqual(expect.arrayContaining(["BaseType", "Rarity", "ItemLevel"]));
  });

  it("adds a name the draft uses even when the grammar does not know it", () => {
    expect(conditionOptions(["Madeup"], "")).toContain("Madeup");
  });

  it("adds the current name, once, when it is not empty", () => {
    expect(conditionOptions(["Madeup"], "Madeup").filter((name) => name === "Madeup")).toHaveLength(1);
  });

  it("never offers an empty name", () => {
    expect(conditionOptions([], "")).not.toContain("");
  });

  it("returns the list sorted", () => {
    const options = conditionOptions(["Zzz", "Aaa"], "Mmm");

    expect(options).toEqual([...options].sort());
  });
});
