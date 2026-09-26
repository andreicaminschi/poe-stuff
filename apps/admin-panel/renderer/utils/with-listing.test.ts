import { describe, it, expect } from "@jest/globals";
import { withListing } from "./with-listing.ts";
import { ggg } from "../test-helpers.ts";

describe("withListing", () => {
  it("sets the listing", () => {
    expect(withListing(ggg("a"), { name: "a" }).listing).toEqual({ name: "a" });
  });

  it("removes the key when the listing is cleared", () => {
    expect("listing" in withListing(ggg("a", { listing: { name: "a" } }), undefined)).toBe(false);
  });
});
