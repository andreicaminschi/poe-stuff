import { describe, expect, it } from "@jest/globals";
import { bronzeKey, goldKey, goldPrefix, latestKey, manifestKey, silverKey, silverPrefix, slug } from "./keys.ts";

describe("slug", () => {
  it("lowercases and joins words with single hyphens", () => {
    expect(slug("Stackable Currency")).toBe("stackable-currency");
  });

  it("collapses runs of punctuation into one hyphen", () => {
    expect(slug("Maps & Fragments / Scarabs")).toBe("maps-fragments-scarabs");
  });

  it("trims hyphens from both ends", () => {
    expect(slug("  (Gems)  ")).toBe("gems");
  });

  it("drops non-ASCII letters", () => {
    expect(slug("Mjölner")).toBe("mj-lner");
  });

  it("turns a string of only punctuation into an empty slug", () => {
    expect(slug("!!!")).toBe("");
  });
});

describe("keys", () => {
  it("places each stage's file under the run", () => {
    expect([bronzeKey("r_1", "a.json"), silverKey("r_1", "b.json"), goldKey("r_1", "c.json")]).toEqual([
      "catalog/run=r_1/bronze/a.json",
      "catalog/run=r_1/silver/b.json",
      "catalog/run=r_1/gold/c.json",
    ]);
  });

  it("gives the silver and gold folders as prefixes", () => {
    expect([silverPrefix("r_1"), goldPrefix("r_1")]).toEqual(["catalog/run=r_1/silver", "catalog/run=r_1/gold"]);
  });

  it("names the published file after the league's slug", () => {
    expect(latestKey("Mercenaries of Trarthus", "catalog.json")).toBe(
      "catalog/latest/mercenaries-of-trarthus.catalog.json",
    );
  });

  it("puts the manifest at the run's root", () => {
    expect(manifestKey("r_1")).toBe("catalog/run=r_1/manifest.json");
  });
});
