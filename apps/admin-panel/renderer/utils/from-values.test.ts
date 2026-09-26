import { describe, it, expect } from "@jest/globals";
import { fromValues } from "./from-values.ts";
import { authored, ggg } from "../test-helpers.ts";

describe("fromValues", () => {
  it("uses a game item's name as its only base type", () => {
    expect(fromValues(ggg("Chaos Orb", { displayName: "Chaos" }))).toEqual({ name: "Chaos Orb", baseTypes: ["Chaos Orb"] });
  });

  it("uses an authored row's base type", () => {
    expect(fromValues(authored("Mine", { baseType: "Onyx Amulet" }))).toEqual({ name: "Mine", baseTypes: ["Onyx Amulet"] });
  });

  it("keeps an authored row's empty base type as an empty entry", () => {
    expect(fromValues(authored("Mine", { baseType: "" })).baseTypes).toEqual([""]);
  });
});
