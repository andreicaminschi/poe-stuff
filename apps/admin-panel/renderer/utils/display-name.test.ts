import { describe, it, expect } from "@jest/globals";
import type { AuthoredItem, GggItem } from "../../api/taxonomy/types.ts";
import { displayName } from "./display-name.ts";
import { withDisplayName } from "./with-display-name.ts";

const ggg: GggItem = {
  source: "ggg",
  key: "Metadata/Chaos",
  name: "Chaos Orb",
  classification: { category: "StackableCurrency", subcategory: null },
  conditions: [],
  variants: [],
};

const authored: AuthoredItem = {
  source: "authored",
  key: "authored/inspiring",
  name: "Absolution of Inspiring",
  baseType: "Absolution",
  classification: { category: "gem", subcategory: null },
  reason: "r",
  replaces: [],
  conditions: [],
  variants: [],
};

describe("displayName", () => {
  it("shows RePoE's name when a plain item has no display name, or an empty one", () => {
    expect(displayName(ggg)).toBe("Chaos Orb");
    expect(displayName({ ...ggg, displayName: "  " })).toBe("Chaos Orb");
  });

  it("shows a plain item's display name when it has one", () => {
    expect(displayName({ ...ggg, displayName: "Chaos" })).toBe("Chaos");
  });

  it("shows an authored row's own name", () => {
    expect(displayName(authored)).toBe("Absolution of Inspiring");
  });
});

describe("withDisplayName", () => {
  it("edits a plain item's display name and never its RePoE name", () => {
    expect(withDisplayName(ggg, "Chaos")).toMatchObject({ name: "Chaos Orb", displayName: "Chaos" });
  });

  it("edits an authored row's name", () => {
    expect(withDisplayName(authored, "Inspiring")).toMatchObject({ name: "Inspiring", baseType: "Absolution" });
  });
});
