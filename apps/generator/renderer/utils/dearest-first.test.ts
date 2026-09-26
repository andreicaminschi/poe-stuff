import { describe, it, expect } from "@jest/globals";
import type { Item, Placement } from "@poe/filter-style/types";
import { dearestFirst } from "./dearest-first.ts";

const placement = (name: string, prices: Item["prices"], extra: Partial<Placement> = {}): Placement => ({
  item: { name, key: name, category: "x", prices },
  bucket: "T1",
  verb: "take",
  reason: "",
  won: true,
  ...extra,
});

describe("dearestFirst", () => {
  it("orders by stack floor where there is one, then by the verb's price, unpriced last", () => {
    const cheap = placement("cheap", { take: 1 });
    const unpriced = placement("unpriced", {});
    const stacked = placement("stacked", { take: 0.1 }, { stack: { floor: 500 } });
    const checked = placement("checked", { take: 1, check: 50 }, { verb: "check" });

    expect(dearestFirst([cheap, unpriced, stacked, checked]).map((one) => one.item.name)).toEqual([
      "stacked",
      "checked",
      "cheap",
      "unpriced",
    ]);
  });

  it("leaves the input order alone", () => {
    const list = [placement("a", { take: 1 }), placement("b", { take: 2 })];

    dearestFirst(list);

    expect(list.map((one) => one.item.name)).toEqual(["a", "b"]);
  });
});
