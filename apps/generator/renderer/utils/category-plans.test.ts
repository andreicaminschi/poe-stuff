import { describe, it, expect } from "@jest/globals";
import { place } from "@poe/filter-style/place";
import type { Item } from "@poe/filter-style/types";
import { DEFAULT_CONFIG, FALLBACK_PALETTE } from "../../api/generator-api.ts";
import { categoryPlans } from "./category-plans.ts";
import { placeOptions } from "./place-options.ts";

const item = (name: string, category: string, take: number): Item => ({ name, key: name, category, prices: { take } });
const items = [
  item("Wisdom", "Currency", 0.1),
  item("Mirror", "Currency", 90000),
  item("Coins", "Gold", 1),
  item("Odd", "unknown", 5),
];
const categories = { Gold: { conditions: [], tiering: "stack-size" as const } };

describe("categoryPlans", () => {
  it("makes one plan per category that holds an item, Currency first", () => {
    const plans = categoryPlans(items, categories, DEFAULT_CONFIG);

    expect(plans.map((plan) => plan.palette)).toEqual([
      DEFAULT_CONFIG.categories.Currency?.palette,
      DEFAULT_CONFIG.categories.Gold?.palette,
      FALLBACK_PALETTE,
    ]);
  });

  it("places only the category's own items, with that category's options", () => {
    const [, gold] = categoryPlans(items, categories, DEFAULT_CONFIG);

    expect(gold?.placed).toEqual(place([items[2] as Item], placeOptions(DEFAULT_CONFIG, "Gold", categories.Gold)));
  });

  it("makes no plans for no items", () => {
    expect(categoryPlans([], categories, DEFAULT_CONFIG)).toEqual([]);
  });
});
