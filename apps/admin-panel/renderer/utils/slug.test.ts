import { describe, it, expect } from "@jest/globals";
import { slug } from "./slug.ts";

describe("slug", () => {
  it("lowercases and joins words with single hyphens", () => {
    const text = slug("Map  Fragments & Keys");

    expect(text).toBe("map-fragments-keys"); // a run of separators becomes one hyphen
  });

  it("keeps digits", () => {
    const text = slug("Tier 16 Maps");

    expect(text).toBe("tier-16-maps");
  });

  it("trims hyphens from both ends", () => {
    const text = slug("--Boss!!");

    expect(text).toBe("boss");
  });

  it("turns text with no letters or digits into an empty slug", () => {
    const text = slug("  !! ");

    expect(text).toBe("");
  });

  it("strips diacritics off accented letters", () => {
    const text = slug("Mjölner");

    expect(text).toBe("mjolner"); // decomposed then combining marks dropped, not replaced by a hyphen
  });
});
