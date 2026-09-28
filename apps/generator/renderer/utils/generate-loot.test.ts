import { describe, it, expect, jest, afterEach } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { BucketName } from "@poe/filter-style/types";
import { LOOT_COUNT, randomLoot, valuableLoot } from "./generate-loot.ts";
import type { Loot } from "./loot-pool.ts";

const style = tierStyle({ primary: "#ff0000", secondary: "#ffffff", icon: "Star" }, "T1");
const loot = (name: string, bucket: BucketName, worth: number): Loot => ({ name, bucket, style, worth });
const pool = [loot("top", "T0", 100), loot("high", "T1", 50), loot("junk", "T5", 1)];
const count = (drop: readonly Loot[], test: (one: Loot) => boolean): number => drop.filter(test).length;

afterEach(() => {
  jest.restoreAllMocks();
});

describe("randomLoot", () => {
  it("drops ten items from a non-empty pool", () => {
    const drop = randomLoot(pool);

    expect(drop).toHaveLength(LOOT_COUNT);
  }); // picks with replacement, so a three-item pool still fills ten

  it("drops nothing from an empty pool", () => {
    const drop = randomLoot([]);

    expect(drop).toEqual([]);
  }); // undefined picks are filtered out

  it("drops only the 1c item when every roll lands near the top", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);

    const drop = randomLoot(pool);

    expect(new Set(drop.map((one) => one.name))).toEqual(new Set(["junk"]));
  }); // the 1c weight covers over 95% of the roll range
});

describe("valuableLoot", () => {
  it("drops ten items with at least one T0 and two T1", () => {
    const drop = valuableLoot(pool);

    expect([drop.length, count(drop, (one) => one.bucket === "T0") >= 1, count(drop, (one) => one.bucket === "T1") >= 2]).toEqual([
      LOOT_COUNT,
      true,
      true,
    ]);
  }); // three sure drops plus seven weighted ones

  it("drops the only T1 item twice to keep the two-T1 promise", () => {
    const drop = valuableLoot(pool);

    expect(count(drop, (one) => one.name === "high")).toBeGreaterThanOrEqual(2);
  }); // fewer than two T1s falls back to two uniform picks

  it("still drops ten items when the pool has no T0 or T1", () => {
    const drop = valuableLoot([loot("junk", "T5", 1)]);

    expect(drop.map((one) => one.name)).toEqual(Array.from({ length: LOOT_COUNT }, () => "junk"));
  }); // empty sure picks leave all ten to the weighted draw

  it("drops nothing from an empty pool", () => {
    const drop = valuableLoot([]);

    expect(drop).toEqual([]);
  }); // uniform of an empty list is [], not [undefined]
});
