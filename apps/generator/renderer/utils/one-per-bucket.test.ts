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
  it("shows the dearest placement of each bucket, in the order the buckets are named", () => {
    const rows = onePerBucket(palette, ["T0", "T1"], [placement("cheap", "T1", 1), placement("dear", "T1", 9), placement("top", "T0", 99)]);

    expect(rows.map((row) => row.name)).toEqual(["top", "dear"]);
  });

  it("keys a filled row by the bucket's position in the list", () => {
    const rows = onePerBucket(palette, ["T0", "T1"], [placement("dear", "T1", 9)]);

    expect(rows[1]?.id).toBe("dear|T1|1");
  });

  it("leaves a styled vacant row for a bucket with no placement", () => {
    expect(onePerBucket(palette, ["T3"], [])).toEqual([{ id: "vacant|T3", bucket: "T3", style: tierStyle(palette, "T3") }]);
  });
});
