import { describe, it, expect } from "@jest/globals";
import { catalogKey, categoriesKey } from "./keys.ts";

describe("catalogKey", () => {
  it("lowercases the league and turns each run of spaces and punctuation into one dash", () => {
    const key = catalogKey("Hardcore  Allflame!");

    expect(key).toBe("catalog/latest/hardcore-allflame.catalog.json");
  }); // two spaces become one dash, the trailing ! is trimmed

  it("drops dashes left at either end of the league name", () => {
    const key = catalogKey("  (Allflame)  ");

    expect(key).toBe("catalog/latest/allflame.catalog.json");
  }); // trim runs after the replace
});

describe("categoriesKey", () => {
  it("names the category table beside the league's catalog under the same slug", () => {
    const key = categoriesKey("HC Allflame");

    expect(key).toBe("catalog/latest/hc-allflame.catalog.categories.json");
  }); // must agree with the catalog's own publish keys
});
