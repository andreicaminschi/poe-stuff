import { describe, it, expect } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { BucketName, Palette, Placement } from "@poe/filter-style/types";
import { onePerBucket } from "./one-per-bucket.ts";

const palette: Palette = { primary: "#ff0000", secondary: "#ffffff", icon: "Star" };
const placement = (name: string, bucket: BucketName, take: number): Placement => ({
  item: { name, key: name, category: "x", prices: { take } },
  bucket,
  verb: "take",
  reason: "",
  won: true,
});

describe("onePerBucket", () => {
  it("shows the 9c item over the 1c one in T1, in the order the buckets are named", () => {
    const placements = [placement("cheap", "T1", 1), placement("dear", "T1", 9), placement("top", "T0", 99)];

    const rows = onePerBucket(palette, ["T0", "T1"], placements);

    expect(rows.map((row) => row.name)).toEqual(["top", "dear"]);
  }); // order follows the names list, not the input

  it("keys a filled row by the bucket's position in the list", () => {
    const rows = onePerBucket(palette, ["T0", "T1"], [placement("dear", "T1", 9)]);

    expect(rows[1]?.id).toBe("dear|T1|1");
  }); // position of the bucket, not of the placement

  it("leaves a styled vacant row for a bucket nothing was placed in", () => {
    const rows = onePerBucket(palette, ["T3"], []);

    expect(rows).toEqual([{ id: "vacant|T3", bucket: "T3", style: tierStyle(palette, "T3") }]);
  }); // no name, worth or reason on a vacant row
});
