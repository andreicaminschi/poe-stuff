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
    const pool = lootPool([plan([placement("winner", { take: 1 }), placement("loser", { take: 1 }, { won: false })])]);

    expect(pool.map((one) => one.name)).toEqual(["winner"]);
  });

  it("gathers the winners of every category in plan order", () => {
    const pool = lootPool([plan([placement("a", { take: 1 })]), plan([placement("b", { take: 1 })])]);

    expect(pool.map((one) => one.name)).toEqual(["a", "b"]);
  });

  it("styles each drop for its bucket and verb", () => {
    const [one] = lootPool([plan([placement("a", { check: 4 }, { verb: "check", bucket: "T0" })])]);

    expect(one?.style).toEqual(tierStyle(palette, "T0", "check"));
  });

  it("values a drop at its stack floor, else its verb's price, else zero", () => {
    const pool = lootPool([
      plan([
        placement("stack", { take: 3 }, { stack: { floor: 250 } }),
        placement("priced", { take: 3 }),
        placement("free", {}),
      ]),
    ]);

    expect(pool.map((one) => one.worth)).toEqual([250, 3, 0]);
  });
});
