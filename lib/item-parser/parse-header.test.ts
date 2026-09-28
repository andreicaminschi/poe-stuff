import { describe, it, expect } from "@jest/globals";
import { parseHeader } from "./parse-header.ts";

describe("parseHeader", () => {
  it("reads a rare's rolled name from the first name line and its base type from the second", () => {
    const header = parseHeader(["Item Class: Rings", "Rarity: Rare", "Maelström Circle", "Amethyst Ring"]);

    expect(header).toEqual({ itemClass: "Rings", rarity: "Rare", name: "Maelström Circle", baseType: "Amethyst Ring" });
  });

  it("reads a single name line as the base type and leaves the name empty", () => {
    const header = parseHeader(["Item Class: Maps", "Rarity: Normal", "Blighted Map (Tier 16)"]);

    expect(header).toEqual({ itemClass: "Maps", rarity: "Normal", name: "", baseType: "Blighted Map (Tier 16)" }); // base type is always the last line
  });

  it("joins every name line before the last into the name", () => {
    const header = parseHeader(["One", "Two", "Three"]);

    expect([header.name, header.baseType]).toEqual(["One Two", "Three"]);
  });

  it("gives an empty class and rarity when the text has neither line", () => {
    const header = parseHeader(["Amethyst Ring"]);

    expect(header).toEqual({ itemClass: "", rarity: "", name: "", baseType: "Amethyst Ring" }); // empty, not a throw
  });

  it("gives every field empty for no lines", () => {
    const header = parseHeader([]);

    expect(header).toEqual({ itemClass: "", rarity: "", name: "", baseType: "" });
  });

  it("treats a key and value line other than class or rarity as a name line", () => {
    const header = parseHeader(["Rarity: Rare", "Foo: Bar", "Amethyst Ring"]);

    expect([header.name, header.baseType]).toEqual(["Foo: Bar", "Amethyst Ring"]);
  });
});
