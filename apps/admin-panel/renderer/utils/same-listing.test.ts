import { describe, it, expect } from "@jest/globals";
import { sameListing } from "./same-listing.ts";

describe("sameListing", () => {
  it("ignores the name", () => {
    expect(sameListing({ name: "a", itemLevel: 86 }, { name: "b", itemLevel: 86 })).toBe(true);
  });

  it("tells listings apart by any other value", () => {
    expect(sameListing({ itemLevel: 86 }, { itemLevel: 85 })).toBe(false);
  });

  it("tells listings apart when one has an extra key", () => {
    expect(sameListing({ itemLevel: 86 }, { itemLevel: 86, frame: 3 })).toBe(false);
  });

  it("treats two missing listings as the same", () => {
    expect(sameListing(undefined, undefined)).toBe(true);
  });

  it("treats a name-only listing as the same as no listing", () => {
    expect(sameListing({ name: "a" }, undefined)).toBe(true);
  });

  it("counts a key set to undefined as missing", () => {
    expect(sameListing({ itemLevel: undefined }, {})).toBe(true);
  });
});
