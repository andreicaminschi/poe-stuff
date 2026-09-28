import { describe, it, expect } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { Loot } from "./loot-pool.ts";
import { weightedPick } from "./weighted-pick.ts";

const style = tierStyle({ primary: "#ff0000", secondary: "#ffffff", icon: "Star" }, "T1");
const loot = (name: string, worth: number): Loot => ({ name, bucket: "T1", style, worth });

describe("weightedPick", () => {
  it("picks nothing from an empty pool", () => {
    const picked = weightedPick([], () => 0.5);

    expect(picked).toBeUndefined();
  }); // falls through to pool[-1]

  it("picks a 1c item for any roll below ten elevenths when the other item is 10c", () => {
    const pool = [loot("cheap", 1), loot("dear", 10)];

    const picked = weightedPick(pool, () => 10 / 11 - 1e-9);

    expect(picked?.name).toBe("cheap");
  }); // weights 1 and 0.1, so the split sits at 10/11

  it("picks the 10c item for a roll just past ten elevenths", () => {
    const pool = [loot("cheap", 1), loot("dear", 10)];

    const picked = weightedPick(pool, () => 10 / 11 + 1e-9);

    expect(picked?.name).toBe("dear");
  }); // the other side of the same boundary

  it("weighs a free item the same as a half-chaos one, splitting the roll at one half", () => {
    const pool = [loot("free", 0), loot("half", 0.5)];

    const picks = [weightedPick(pool, () => 0.5)?.name, weightedPick(pool, () => 0.5 + 1e-9)?.name];

    expect(picks).toEqual(["free", "half"]);
  }); // worth 0 is clamped to 0.5, else 1/0 is Infinity

  it("picks the first item when the roll is exactly zero", () => {
    const picked = weightedPick([loot("a", 1), loot("b", 1)], () => 0);

    expect(picked?.name).toBe("a");
  }); // `<= 0` catches the first weight

  it("picks the last item when the roll is at the very top", () => {
    const picked = weightedPick([loot("a", 1), loot("b", 1)], () => 1);

    expect(picked?.name).toBe("b");
  }); // float leftovers fall to the last-item fallback
});
