import { describe, it, expect } from "@jest/globals";
import { categoryLabel } from "./category-label.ts";
import { category } from "../test-helpers.ts";

describe("categoryLabel", () => {
  it("uses each level's recorded name, joined by a chevron", () => { // each level is looked up by its full path
    const categories = {
      maps: category("maps", { name: "Map Fragments" }),
      "maps/boss": category("maps/boss", { name: "Boss" }),
    };

    expect(categoryLabel(categories, "maps/boss")).toBe("Map Fragments › Boss");
  });

  it("title-cases a level that has no record", () => { // hyphens become spaces
    expect(categoryLabel({}, "map-fragments/boss-keys")).toBe("Map Fragments › Boss Keys");
  });

  it("title-cases a level whose record has no name", () => { // a record without a name is not a label
    expect(categoryLabel({ gems: category("gems") }, "gems")).toBe("Gems");
  });

  it("does not borrow a subcategory's name from a top level with the same slug", () => { // "boss" alone is not "maps/boss"
    expect(categoryLabel({ boss: category("boss", { name: "Wrong" }) }, "maps/boss")).toBe("Maps › Boss");
  });
});
