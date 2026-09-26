import { describe, it, expect } from "@jest/globals";
import { parseHeader } from "./parse-header.ts";

describe("parseHeader", () => {
  it("reads a rare's rolled name and base type from two name lines", () => {
    expect(parseHeader(["Item Class: Rings", "Rarity: Rare", "Maelström Circle", "Amethyst Ring"])).toEqual({
      itemClass: "Rings",
      rarity: "Rare",
      name: "Maelström Circle",
      baseType: "Amethyst Ring",
    });
  });

  it("leaves the name empty and uses the single line as base type", () => {
    expect(parseHeader(["Item Class: Maps", "Rarity: Normal", "Blighted Map (Tier 16)"])).toEqual({
      itemClass: "Maps",
      rarity: "Normal",
      name: "",
      baseType: "Blighted Map (Tier 16)",
    });
  });

  it("joins every name line before the last into the name", () => {
    const header = parseHeader(["One", "Two", "Three"]);

    expect([header.name, header.baseType]).toEqual(["One Two", "Three"]);
  });

  it("returns empty strings when class and rarity are missing", () => {
    expect(parseHeader(["Amethyst Ring"])).toEqual({ itemClass: "", rarity: "", name: "", baseType: "Amethyst Ring" });
  });

  it("returns every field empty for no lines", () => {
    expect(parseHeader([])).toEqual({ itemClass: "", rarity: "", name: "", baseType: "" });
  });

  it("treats an unknown key-value line as a name line", () => {
    const header = parseHeader(["Rarity: Rare", "Foo: Bar", "Amethyst Ring"]);

    expect([header.name, header.baseType]).toEqual(["Foo: Bar", "Amethyst Ring"]);
  });
});
