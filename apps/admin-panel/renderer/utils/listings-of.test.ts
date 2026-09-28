import { describe, it, expect } from "@jest/globals";
import { listingsOf } from "./listings-of.ts";

describe("listingsOf", () => {
  it("reads a row with no listing as an empty list", () => { // undefined, not an error
    expect(listingsOf(undefined)).toEqual([]);
  });

  it("wraps one listing in a list", () => { // a single object is the common way to write it
    expect(listingsOf({ name: "a" })).toEqual([{ name: "a" }]);
  });

  it("returns a list of listings as it is, not a copy", () => { // same reference back
    const listing = [{ name: "a" }, { name: "b" }];

    expect(listingsOf(listing)).toBe(listing);
  });
});
