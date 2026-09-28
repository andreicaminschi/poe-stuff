import { describe, expect, it } from "@jest/globals";
import { TYPE_RULES, groupFor } from "./item-types.ts";

describe("groupFor", () => {
  it("files a flask under flasks whatever slot the row names", () => {
    const group = groupFor(TYPE_RULES.Flask, "Life Flask");

    expect(group).toBe("flasks");
  }); // a fixed group wins over itemType

  it("files a unique body armour under its slot, lowercased with the space taken out", () => {
    const group = groupFor(TYPE_RULES.UniqueArmour, "Body Armour");

    expect(group).toBe("bodyarmour");
  }); // replaceAll, so every space goes

  it("gives an equipment row with no slot no group", () => {
    const group = groupFor(TYPE_RULES.BaseType, undefined);

    expect(group).toBeNull();
  }); // absent itemType

  it("gives an equipment row with an empty slot no group, not an empty one", () => {
    const group = groupFor(TYPE_RULES.BaseType, "");

    expect(group).toBeNull();
  }); // "" is treated like absent
});
