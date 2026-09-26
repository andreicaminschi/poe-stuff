import { describe, expect, it } from "@jest/globals";
import { TYPE_RULES, groupFor } from "./item-types.ts";

describe("groupFor", () => {
  it("uses the type's fixed group and ignores the row's slot", () => {
    expect(groupFor(TYPE_RULES.Flask, "Life Flask")).toBe("flasks");
  });

  it("lowercases the row's slot and drops its spaces for equipment types", () => {
    expect(groupFor(TYPE_RULES.UniqueArmour, "Body Armour")).toBe("bodyarmour");
  });

  it("has no group for an equipment row with no slot or an empty one", () => {
    expect(groupFor(TYPE_RULES.BaseType, undefined)).toBeNull();
    expect(groupFor(TYPE_RULES.BaseType, "")).toBeNull();
  });
});
