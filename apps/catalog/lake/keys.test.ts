import { describe, expect, it } from "@jest/globals";
import { bronzeKey, goldKey, goldPrefix, latestKey, manifestKey, silverKey, silverPrefix, slug } from "./keys.ts";

describe("slug", () => {
  it("lowercases and joins words with single hyphens", () => {
    expect(slug("Stackable Currency")).toBe("stackable-currency");
  }); // spaces are just another non-alphanumeric run

  it("collapses a run of spaces and punctuation into one hyphen", () => {
    expect(slug("Maps & Fragments / Scarabs")).toBe("maps-fragments-scarabs");
  }); // " & " is one run, not three hyphens

  it("trims hyphens from both ends", () => {
    expect(slug("  (Gems)  ")).toBe("gems");
  }); // trim runs after the replace

  it("turns a letter outside ASCII into a hyphen", () => {
    expect(slug("Mjölner")).toBe("mj-lner");
  }); // ö is not in a-z, so it splits the word

  it("turns a name made only of punctuation into an empty slug", () => {
    expect(slug("!!!")).toBe("");
  }); // everything collapses then trims away
});

describe("keys", () => {
  it("files each stage's output under the run's own folder", () => {
    const keys = [bronzeKey("r_1", "a.json"), silverKey("r_1", "b.json"), goldKey("r_1", "c.json")];

    expect(keys).toEqual(["catalog/run=r_1/bronze/a.json", "catalog/run=r_1/silver/b.json", "catalog/run=r_1/gold/c.json"]);
  }); // the admin panel reads these paths by convention

  it("gives the silver and gold folders as prefixes a listing can start from", () => {
    const prefixes = [silverPrefix("r_1"), goldPrefix("r_1")];

    expect(prefixes).toEqual(["catalog/run=r_1/silver", "catalog/run=r_1/gold"]);
  }); // no trailing slash

  it("names the published file after the league's slug", () => {
    const key = latestKey("Mercenaries of Trarthus", "catalog.json");

    expect(key).toBe("catalog/latest/mercenaries-of-trarthus.catalog.json");
  }); // the generator reads this exact key

  it("puts the manifest at the run's root, beside the stage folders", () => {
    expect(manifestKey("r_1")).toBe("catalog/run=r_1/manifest.json");
  }); // not inside any stage
});
