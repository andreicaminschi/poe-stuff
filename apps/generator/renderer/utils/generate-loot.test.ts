import { describe, it, expect, jest, afterEach } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { BucketName } from "@poe/filter-style/types";
import { LOOT_COUNT, randomLoot, valuableLoot } from "./generate-loot.ts";
import type { Loot } from "./loot-pool.ts";

const style = tierStyle({ primary: "#ff0000", secondary: "#ffffff", icon: "Star" }, "T1");
const loot = (name: string, bucket: BucketName, worth: number): Loot => ({ name, bucket, style, worth });
const pool = [loot("top", "T0", 100), loot("high", "T1", 50), loot("junk", "T5", 1)];

afterEach(() => {
  jest.restoreAllMocks();
});

describe("randomLoot", () => {
  it("drops ten items", () => {
    expect(randomLoot(pool)).toHaveLength(LOOT_COUNT);
  });

  it("drops nothing from an empty pool", () => {
    expect(randomLoot([])).toEqual([]);
  });

  it("drops the cheapest item when every roll is low", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);

    expect(new Set(randomLoot(pool).map((one) => one.name))).toEqual(new Set(["junk"]));
  });
});

describe("valuableLoot", () => {
  it("drops ten items with at least one T0 and two T1", () => {
    const drop = valuableLoot(pool);

    expect(drop).toHaveLength(LOOT_COUNT);
    expect(drop.filter((one) => one.bucket === "T0").length).toBeGreaterThanOrEqual(1);
    expect(drop.filter((one) => one.bucket === "T1").length).toBeGreaterThanOrEqual(2);
  });

  it("repeats the only T1 item to meet the two-T1 guarantee", () => {
    const drop = valuableLoot(pool);

    expect(drop.filter((one) => one.name === "high").length).toBeGreaterThanOrEqual(2);
  });

  it("still drops ten items when the pool has no T0 or T1", () => {
    const drop = valuableLoot([loot("junk", "T5", 1)]);

    expect(drop.map((one) => one.name)).toEqual(Array.from({ length: LOOT_COUNT }, () => "junk"));
  });

  it("drops nothing from an empty pool", () => {
    expect(valuableLoot([])).toEqual([]);
  });
});
