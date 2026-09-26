import { describe, it, expect } from "@jest/globals";
import { catalogKey, categoriesKey, configKey } from "./keys.ts";

describe("catalogKey", () => {
  it("lowercases the league and joins every run of other characters with one dash", () => {
    expect(catalogKey("Hardcore  Allflame!")).toBe("catalog/latest/hardcore-allflame.catalog.json");
  });

  it("drops dashes left at either end of the league name", () => {
    expect(catalogKey("  (Allflame)  ")).toBe("catalog/latest/allflame.catalog.json");
  });
});

describe("categoriesKey", () => {
  it("names the category table beside the league's catalog", () => {
    expect(categoriesKey("Allflame")).toBe("catalog/latest/allflame.catalog.categories.json");
  });
});

describe("configKey", () => {
  it("keeps one config file for every league", () => {
    expect(configKey()).toBe("generator/config.json");
  });
});
