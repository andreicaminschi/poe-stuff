import { describe, it, expect } from "@jest/globals";
import { categoryLabel } from "./category-label.ts";
import { category } from "../test-helpers.ts";

describe("categoryLabel", () => {
  it("uses each level's recorded name", () => {
    const categories = {
      maps: category("maps", { name: "Map Fragments" }),
      "maps/boss": category("maps/boss", { name: "Boss" }),
    };

    expect(categoryLabel(categories, "maps/boss")).toBe("Map Fragments › Boss");
  });

  it("title-cases a level that has no record", () => {
    expect(categoryLabel({}, "map-fragments/boss-keys")).toBe("Map Fragments › Boss Keys");
  });

  it("title-cases a level whose record has no name", () => {
    expect(categoryLabel({ gems: category("gems") }, "gems")).toBe("Gems");
  });
});
