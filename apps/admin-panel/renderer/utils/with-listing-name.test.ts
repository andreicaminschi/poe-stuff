import { describe, it, expect } from "@jest/globals";
import { withListingName } from "./with-listing-name.ts";

describe("withListingName", () => {
  it("drops the match entirely when the name was all it held", () => {
    expect(withListingName({ name: "X" }, "  ")).toBeUndefined();
  });

  it("keeps the other keys when the name is cleared", () => {
    expect(withListingName({ name: "X", gemLevel: 20 }, "")).toEqual({ gemLevel: 20 });
  });

  it("trims a name before setting it", () => {
    expect(withListingName(undefined, "  Large Cluster Jewel ")).toEqual({ name: "Large Cluster Jewel" });
  });
});
