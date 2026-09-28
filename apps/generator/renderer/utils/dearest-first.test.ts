import { describe, it, expect } from "@jest/globals";
import type { Item, Placement } from "@poe/filter-style/types";
import { dearestFirst, placementWorth } from "./dearest-first.ts";

const placement = (name: string, prices: Item["prices"], extra: Partial<Placement> = {}): Placement => ({
  item: { name, key: name, category: "x", prices },
  bucket: "T1",
  verb: "take",
  reason: "",
  won: true,
  ...extra,
});

const names = (list: readonly Placement[]): string[] => list.map((one) => one.item.name);

describe("placementWorth", () => {
  it("values a stacked placement at its stack floor of 500, not its 0.1c price", () => {
    const stacked = placement("stacked", { take: 0.1 }, { stack: { floor: 500 } });

    expect(placementWorth(stacked)).toBe(500);
  }); // stack floor wins over any price

  it("values a checked placement at its 50c check price, not its 1c take price", () => {
    const checked = placement("checked", { take: 1, check: 50 }, { verb: "check" });

    expect(placementWorth(checked)).toBe(50);
  }); // the verb picks which price is read

  it("values a placement with no price for its verb at zero", () => {
    const unpriced = placement("unpriced", { take: 5 }, { verb: "gamble" });

    expect(placementWorth(unpriced)).toBe(0);
  }); // missing price falls to 0, never NaN
});

describe("dearestFirst", () => {
  it("puts a 500-stack first, then a 50c check, then a 1c take, and an unpriced item last", () => {
    const list = [
      placement("cheap", { take: 1 }),
      placement("unpriced", {}),
      placement("stacked", { take: 0.1 }, { stack: { floor: 500 } }),
      placement("checked", { take: 1, check: 50 }, { verb: "check" }),
    ];

    const sorted = dearestFirst(list);

    expect(names(sorted)).toEqual(["stacked", "checked", "cheap", "unpriced"]);
  }); // stack floors and prices compare on one scale

  it("keeps two equally priced items in the order they came", () => {
    const list = [placement("a", { take: 2 }), placement("b", { take: 2 })];

    const sorted = dearestFirst(list);

    expect(names(sorted)).toEqual(["a", "b"]);
  }); // Array.sort is stable

  it("leaves the list it was given in its original order", () => {
    const list = [placement("a", { take: 1 }), placement("b", { take: 2 })];

    dearestFirst(list);

    expect(names(list)).toEqual(["a", "b"]);
  }); // sorts a copy, never in place
});
