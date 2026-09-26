import { describe, it, expect } from "@jest/globals";
import { listingsOf } from "./listings-of.ts";

describe("listingsOf", () => {
  it("reads no listing as an empty list", () => {
    expect(listingsOf(undefined)).toEqual([]);
  });

  it("wraps one listing in a list", () => {
    expect(listingsOf({ name: "a" })).toEqual([{ name: "a" }]);
  });

  it("returns a list of listings as it is", () => {
    const listing = [{ name: "a" }, { name: "b" }];

    expect(listingsOf(listing)).toBe(listing);
  });
});
