import { describe, it, expect } from "@jest/globals";
import { titleCase } from "./title-case.ts";

describe("titleCase", () => {
  it("capitalises each hyphen-separated word and joins with spaces", () => {
    expect(titleCase("map-fragments")).toBe("Map Fragments");
  });

  it("leaves the rest of each word untouched", () => {
    expect(titleCase("pOE-item")).toBe("POE Item");
  });

  it("returns an empty string for an empty slug", () => {
    expect(titleCase("")).toBe("");
  });

  it("keeps a doubled hyphen as a doubled space", () => {
    expect(titleCase("a--b")).toBe("A  B");
  });
});
