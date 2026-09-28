import { describe, it, expect } from "@jest/globals";
import { conditionOptions } from "./condition-options.ts";

describe("conditionOptions", () => {
  it("offers the PoE1 filter conditions when the draft uses none", () => { // read from filter-eval's registry
    expect(conditionOptions([], "")).toEqual(expect.arrayContaining(["BaseType", "Rarity", "ItemLevel"]));
  });

  it("adds a name the draft uses even when the grammar does not know it", () => { // so an unknown name can still be seen and fixed
    expect(conditionOptions(["Madeup"], "")).toContain("Madeup");
  });

  it("offers the name being edited only once when the draft also uses it", () => { // deduplicated through a Set
    expect(conditionOptions(["Madeup"], "Madeup").filter((name) => name === "Madeup")).toHaveLength(1);
  });

  it("adds the name being edited when nothing else offers it", () => { // current is its own source
    expect(conditionOptions([], "Typed")).toContain("Typed");
  });

  it("never offers an empty name for a blank field", () => { // an empty current is skipped
    expect(conditionOptions([], "")).not.toContain("");
  });

  it("returns the list sorted", () => { // added names are mixed in, not appended
    const options = conditionOptions(["Zzz", "Aaa"], "Mmm");

    expect(options).toEqual([...options].sort());
  });
});
