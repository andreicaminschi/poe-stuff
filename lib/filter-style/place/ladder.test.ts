import { describe, it, expect } from "@jest/globals";
import { holds, ladderOf, span } from "./ladder.ts";

const floors = { T0: 500, T1: 100, T2: 20, T3: 5, T4: 2, T5: 1 };

describe("ladderOf", () => {
  it("lists every tier richest first, each capped by the floor above it, then Hidden under the lowest floor", () => {
    const ladder = ladderOf(floors, []);

    expect(ladder).toEqual([
      { name: "T0", floor: 500 },
      { name: "T1", floor: 100, ceiling: 500 },
      { name: "T2", floor: 20, ceiling: 100 },
      { name: "T3", floor: 5, ceiling: 20 },
      { name: "T4", floor: 2, ceiling: 5 },
      { name: "T5", floor: 1, ceiling: 2 },
      { name: "Hidden", floor: 0, ceiling: 1 },
    ]); // ceilings are exclusive
  });

  it("gives a disabled T1's range to T2, so T2 runs from 20 up to 500", () => {
    const ladder = ladderOf(floors, ["T1"]);

    expect(ladder.find((one) => one.name === "T2")).toEqual({ name: "T2", floor: 20, ceiling: 500 }); // ceiling from the next enabled tier
  });

  it("leaves the richest enabled tier with no ceiling when T0 is disabled", () => {
    const ladder = ladderOf(floors, ["T0"]);

    expect(ladder[0]).toEqual({ name: "T1", floor: 100 });
  });

  it("leaves only Hidden, with no ceiling, when all six tiers are disabled", () => {
    const ladder = ladderOf(floors, ["T0", "T1", "T2", "T3", "T4", "T5"]);

    expect(ladder).toEqual([{ name: "Hidden", floor: 0 }]); // Hidden takes everything
  });
});

describe("holds", () => {
  const bucket = { name: "T2" as const, floor: 20, ceiling: 100 };

  it("takes a price exactly at the floor", () => {
    expect(holds(bucket, 20)).toBe(true); // floor inclusive
  });

  it("refuses a price just under the floor", () => {
    expect(holds(bucket, 19.99)).toBe(false);
  });

  it("refuses a price exactly at the ceiling", () => {
    expect(holds(bucket, 100)).toBe(false); // ceiling exclusive: 100 belongs to the tier above
  });

  it("takes a billion when the bucket has no ceiling", () => {
    expect(holds({ name: "T0", floor: 500 }, 1e9)).toBe(true);
  });
});

describe("span", () => {
  it("describes a bucket with no ceiling as its floor and up", () => {
    expect(span({ name: "T0", floor: 500 }, "c")).toBe("500c and up");
  });

  it("describes a bucket starting at zero as under its ceiling", () => {
    expect(span({ name: "Hidden", floor: 0, ceiling: 1 }, "c")).toBe("under 1c"); // not "0-1c"
  });

  it("describes a bucket in the middle as a range, with the unit once at the end", () => {
    expect(span({ name: "T2", floor: 20, ceiling: 100 }, "")).toBe("20-100");
  });
});
