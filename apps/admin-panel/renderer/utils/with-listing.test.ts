import { describe, it, expect } from "@jest/globals";
import { withListing } from "./with-listing.ts";
import { ggg } from "../test-helpers.ts";

describe("withListing", () => {
  it("sets the listing", () => {
    const row = withListing(ggg("a"), { name: "a" });

    expect(row.listing).toEqual({ name: "a" });
  });

  it("replaces an earlier listing", () => {
    const row = withListing(ggg("a", { listing: { name: "old" } }), [{ name: "b" }, { name: "c" }]);

    expect(row.listing).toEqual([{ name: "b" }, { name: "c" }]);
  });

  it("removes the key when the listing is cleared", () => {
    const row = withListing(ggg("a", { listing: { name: "a" } }), undefined);

    expect("listing" in row).toBe(false); // deleted, not set to undefined
  });
});
