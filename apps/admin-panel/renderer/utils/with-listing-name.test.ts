import { describe, it, expect } from "@jest/globals";
import { withListingName } from "./with-listing-name.ts";

describe("withListingName", () => {
  it("sets a trimmed name and keeps the other keys", () => {
    expect(withListingName({ itemLevel: 86 }, "  Onyx  ")).toEqual({ itemLevel: 86, name: "Onyx" });
  });

  it("starts a listing from nothing", () => {
    expect(withListingName(undefined, "Onyx")).toEqual({ name: "Onyx" });
  });

  it("drops the name when it is blank", () => {
    expect(withListingName({ name: "Onyx", frame: 3 }, " ")).toEqual({ frame: 3 });
  });

  it("clears the listing when a blank name leaves no keys", () => {
    expect(withListingName({ name: "Onyx" }, "")).toBeUndefined();
  });
});
