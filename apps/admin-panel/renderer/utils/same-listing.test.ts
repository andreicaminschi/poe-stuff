import { describe, it, expect } from "@jest/globals";
import { sameListing } from "./same-listing.ts";

describe("sameListing", () => {
  it("ignores the name", () => {
    const same = sameListing({ name: "a", itemLevel: 86 }, { name: "b", itemLevel: 86 });

    expect(same).toBe(true);
  });

  it("tells listings apart by any other value", () => {
    const same = sameListing({ itemLevel: 86 }, { itemLevel: 85 });

    expect(same).toBe(false);
  });

  it("tells listings apart when only the second has an extra key", () => {
    const same = sameListing({ itemLevel: 86 }, { itemLevel: 86, frame: 3 });

    expect(same).toBe(false); // keys come from both sides, not just the first
  });

  it("treats two missing listings as the same", () => {
    const same = sameListing(undefined, undefined);

    expect(same).toBe(true);
  });

  it("treats a listing with only a name as the same as no listing", () => {
    const same = sameListing({ name: "a" }, undefined);

    expect(same).toBe(true);
  });

  it("counts a key set to undefined as missing", () => {
    const same = sameListing({ itemLevel: undefined }, {});

    expect(same).toBe(true);
  });
});
