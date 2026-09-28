import { describe, it, expect } from "@jest/globals";
import { conditionNames } from "./condition-names.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

describe("conditionNames", () => {
  it("collects names from categories, rows and variants, once each and sorted", () => { // Rarity appears twice but is listed once
    const draft = draftOf(
      [
        ggg("a", {
          conditions: [{ condition: "Rarity" }],
          variants: [{ name: "v", conditions: [{ condition: "ItemLevel" }, { condition: "Rarity" }] }],
        }),
      ],
      [category("gems", { conditions: [{ condition: "Class" }] })],
    );

    expect(conditionNames(draft)).toEqual(["Class", "ItemLevel", "Rarity"]);
  });

  it("sorts by code unit, so uppercase comes before lowercase", () => { // plain sort(), not localeCompare
    const draft = draftOf([ggg("a", { conditions: [{ condition: "b" }, { condition: "C" }] })]);

    expect(conditionNames(draft)).toEqual(["C", "b"]);
  });

  it("returns no names for an empty draft", () => { // degenerate input
    expect(conditionNames(draftOf())).toEqual([]);
  });
});
