import { describe, it, expect } from "@jest/globals";
import { fromValues } from "./from-values.ts";
import { authored, ggg } from "../test-helpers.ts";

describe("fromValues", () => {
  it("uses a game item's RePoE name as its only base type, not its display name", () => { // a filter matches the RePoE name
    expect(fromValues(ggg("Chaos Orb", { displayName: "Chaos" }))).toEqual({
      name: "Chaos Orb",
      baseTypes: ["Chaos Orb"],
    });
  });

  it("uses an authored row's base type rather than its name", () => { // the name is free text, the base type is what matches
    expect(fromValues(authored("Mine", { baseType: "Onyx Amulet" }))).toEqual({
      name: "Mine",
      baseTypes: ["Onyx Amulet"],
    });
  });

  it("keeps an authored row's empty base type as an empty entry", () => { // not filtered out, so the editor can show the gap
    expect(fromValues(authored("Mine", { baseType: "" })).baseTypes).toEqual([""]);
  });
});
