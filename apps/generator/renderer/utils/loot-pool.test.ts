import { describe, it, expect } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { Item, Palette, Placement } from "@poe/filter-style/types";
import { lootPool } from "./loot-pool.ts";

const palette: Palette = { primary: "#ff0000", secondary: "#ffffff", icon: "Star" };
const placement = (name: string, prices: Item["prices"], extra: Partial<Placement> = {}): Placement => ({
  item: { name, key: name, category: "x", prices },
  bucket: "T2",
  verb: "take",
  reason: "",
  won: true,
  ...extra,
});
const plan = (placed: readonly Placement[]) => ({ palette, placed: { ladder: [], placed, unplaced: [] } });

describe("lootPool", () => {
  it("drops only the placements that won their block", () => {
    const plans = [plan([placement("winner", { take: 1 }), placement("loser", { take: 1 }, { won: false })])];

    const pool = lootPool(plans);

    expect(pool.map((one) => one.name)).toEqual(["winner"]);
  }); // a shadowed block never shows in game

  it("gathers the winners of every category in plan order", () => {
    const plans = [plan([placement("a", { take: 1 })]), plan([placement("b", { take: 1 })])];

    const pool = lootPool(plans);

    expect(pool.map((one) => one.name)).toEqual(["a", "b"]);
  }); // flatMap across plans

  it("styles a checked T0 drop with the check look for T0", () => {
    const plans = [plan([placement("a", { check: 4 }, { verb: "check", bucket: "T0" })])];

    const [one] = lootPool(plans);

    expect(one?.style).toEqual(tierStyle(palette, "T0", "check"));
  }); // verb changes the style, not only the bucket

  it("values a drop at its 250 stack floor, else its 3c price, else zero", () => {
    const plans = [
      plan([placement("stack", { take: 3 }, { stack: { floor: 250 } }), placement("priced", { take: 3 }), placement("free", {})]),
    ];

    const pool = lootPool(plans);

    expect(pool.map((one) => one.worth)).toEqual([250, 3, 0]);
  }); // same worth rule as dearestFirst
});
