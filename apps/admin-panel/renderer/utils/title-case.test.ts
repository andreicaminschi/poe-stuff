import { describe, it, expect } from "@jest/globals";
import { titleCase } from "./title-case.ts";

describe("titleCase", () => {
  it("capitalises each hyphen-separated word and joins them with spaces", () => {
    const title = titleCase("map-fragments");

    expect(title).toBe("Map Fragments");
  });

  it("leaves the rest of each word as it was", () => {
    const title = titleCase("pOE-item");

    expect(title).toBe("POE Item"); // no lowercasing after the first letter
  });

  it("returns an empty string for an empty slug", () => {
    const title = titleCase("");

    expect(title).toBe(""); // charAt(0) of "" is ""
  });

  it("keeps a doubled hyphen as a doubled space", () => {
    const title = titleCase("a--b");

    expect(title).toBe("A  B"); // the empty word between is kept
  });
});
