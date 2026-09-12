import { describe, it, expect } from "@jest/globals";
import { conditionOptions } from "./condition-options.ts";

describe("conditionOptions", () => {
  const options = conditionOptions([], "");

  it("lists the PoE1 filter conditions, sorted", () => {
    expect(options).toContain("BaseType");
    expect(options).toContain("GemLevel");
    expect([...options].sort()).toEqual(options);
  });

  it("leaves out PoE2-only conditions", () => {
    expect(options).not.toContain("AlwaysShow");
    expect(options).not.toContain("WaystoneTier");
  });

  it("keeps a name the draft uses and the current one, once each", () => {
    const withUsed = conditionOptions(["Legacy", "BaseType"], "Typo");

    expect(withUsed).toContain("Legacy");
    expect(withUsed).toContain("Typo");
    expect(withUsed.filter((name) => name === "BaseType")).toHaveLength(1);
  });
});
