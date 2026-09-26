import { describe, it, expect } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { Loot } from "./loot-pool.ts";
import { weightedPick } from "./weighted-pick.ts";

const style = tierStyle({ primary: "#ff0000", secondary: "#ffffff", icon: "Star" }, "T1");
const loot = (name: string, worth: number): Loot => ({ name, bucket: "T1", style, worth });

describe("weightedPick", () => {
  it("answers with nothing for an empty pool", () => {
    expect(weightedPick([], () => 0.5)).toBeUndefined();
  });

  it("gives a 1c item ten times the chance of a 10c item", () => {
    const pool = [loot("cheap", 1), loot("dear", 10)];

    expect(weightedPick(pool, () => 10 / 11 - 1e-9)?.name).toBe("cheap");
    expect(weightedPick(pool, () => 10 / 11 + 1e-9)?.name).toBe("dear");
  });

  it("weighs anything under half a chaos as if it were worth half a chaos", () => {
    const pool = [loot("free", 0), loot("half", 0.5)];

    expect(weightedPick(pool, () => 0.5)?.name).toBe("free");
    expect(weightedPick(pool, () => 0.5 + 1e-9)?.name).toBe("half");
  });

  it("picks the first item when the roll is zero", () => {
    expect(weightedPick([loot("a", 1), loot("b", 1)], () => 0)?.name).toBe("a");
  });

  it("picks the last item when the roll is at the very top", () => {
    expect(weightedPick([loot("a", 1), loot("b", 1)], () => 1)?.name).toBe("b");
  });
});
