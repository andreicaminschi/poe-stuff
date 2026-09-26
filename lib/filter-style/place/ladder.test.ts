import { describe, it, expect } from "@jest/globals";
import { holds, ladderOf, span } from "./ladder.ts";

const floors = { T0: 500, T1: 100, T2: 20, T3: 5, T4: 2, T5: 1 };

describe("ladderOf", () => {
  it("lists every tier richest first, each capped by the floor above, then Hidden under the lowest", () => {
    expect(ladderOf(floors, [])).toEqual([
      { name: "T0", floor: 500 },
      { name: "T1", floor: 100, ceiling: 500 },
      { name: "T2", floor: 20, ceiling: 100 },
      { name: "T3", floor: 5, ceiling: 20 },
      { name: "T4", floor: 2, ceiling: 5 },
      { name: "T5", floor: 1, ceiling: 2 },
      { name: "Hidden", floor: 0, ceiling: 1 },
    ]);
  });

  it("gives a disabled tier's range to the tier below it", () => {
    const ladder = ladderOf(floors, ["T1"]);

    expect(ladder.find((one) => one.name === "T2")).toEqual({ name: "T2", floor: 20, ceiling: 500 });
  });

  it("uncaps the richest enabled tier when the top tier is disabled", () => {
    expect(ladderOf(floors, ["T0"])[0]).toEqual({ name: "T1", floor: 100 });
  });

  it("leaves only an uncapped Hidden when every tier is disabled", () => {
    expect(ladderOf(floors, ["T0", "T1", "T2", "T3", "T4", "T5"])).toEqual([{ name: "Hidden", floor: 0 }]);
  });
});

describe("holds", () => {
  const bucket = { name: "T2" as const, floor: 20, ceiling: 100 };

  it("takes a value exactly at the floor", () => {
    expect(holds(bucket, 20)).toBe(true);
  });

  it("refuses a value just under the floor", () => {
    expect(holds(bucket, 19.99)).toBe(false);
  });

  it("refuses a value exactly at the ceiling", () => {
    expect(holds(bucket, 100)).toBe(false);
  });

  it("takes any value at or over the floor when there is no ceiling", () => {
    expect(holds({ name: "T0", floor: 500 }, 1e9)).toBe(true);
  });
});

describe("span", () => {
  it("describes an uncapped bucket as its floor and up", () => {
    expect(span({ name: "T0", floor: 500 }, "c")).toBe("500c and up");
  });

  it("describes a bucket from zero as under its ceiling", () => {
    expect(span({ name: "Hidden", floor: 0, ceiling: 1 }, "c")).toBe("under 1c");
  });

  it("describes a middle bucket as a range", () => {
    expect(span({ name: "T2", floor: 20, ceiling: 100 }, "")).toBe("20-100");
  });
});
