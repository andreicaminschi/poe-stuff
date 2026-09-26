import { describe, it, expect } from "@jest/globals";
import { slug } from "./slug.ts";

describe("slug", () => {
  it("lowercases and joins words with single hyphens", () => {
    expect(slug("Map  Fragments & Keys")).toBe("map-fragments-keys");
  });

  it("trims hyphens from both ends", () => {
    expect(slug("--Boss!!")).toBe("boss");
  });

  it("turns text with no letters or digits into an empty slug", () => {
    expect(slug("  !! ")).toBe("");
  });

  it("strips diacritics off accented letters", () => {
    expect(slug("Mjölner")).toBe("mjolner");
  });
});
