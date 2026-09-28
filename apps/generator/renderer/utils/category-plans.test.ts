import { describe, it, expect } from "@jest/globals";
import { place } from "@poe/filter-style/place";
import type { Item } from "@poe/filter-style/types";
import { DEFAULT_CONFIG, FALLBACK_PALETTE } from "../../api/generator-api.ts";
import { categoryPlans } from "./category-plans.ts";
import { placeOptions } from "./place-options.ts";

const item = (name: string, category: string, take: number): Item => ({ name, key: name, category, prices: { take } });
const coins = item("Coins", "Gold", 1);
const items = [item("Wisdom", "Currency", 0.1), item("Mirror", "Currency", 90000), coins, item("Odd", "unknown", 5)];
const categories = { Gold: { conditions: [], tiering: "stack-size" as const } };

describe("categoryPlans", () => {
  it("makes one plan per category that holds an item, Currency first, and gives an unconfigured category the fallback palette", () => {
    const plans = categoryPlans(items, categories, DEFAULT_CONFIG);

    expect(plans.map((plan) => plan.palette)).toEqual([
      DEFAULT_CONFIG.categories.Currency?.palette,
      DEFAULT_CONFIG.categories.Gold?.palette,
      FALLBACK_PALETTE,
    ]);
  }); // "unknown" has no config and no category record, yet still gets a plan

  it("places only a category's own items, with that category's stack-size options", () => {
    const [, gold] = categoryPlans(items, categories, DEFAULT_CONFIG);

    expect(gold?.placed).toEqual(place([coins], placeOptions(DEFAULT_CONFIG, "Gold", categories.Gold)));
  }); // Currency items must not leak into Gold's ladder

  it("makes no plans when there are no items", () => {
    const plans = categoryPlans([], categories, DEFAULT_CONFIG);

    expect(plans).toEqual([]);
  }); // categories come from items, not from the record table
});
