import { tierStyle } from "@poe/filter-style/tier-style";
import type { BucketName, Palette, Placement } from "@poe/filter-style/types";
import type { DropRow } from "../components/drop-table.tsx";
import { dearestFirst } from "./dearest-first.ts";
import { dropRow } from "./drop-row.ts";

/** The dearest placement in each bucket, or an empty row where a bucket has none. */
export function onePerBucket(palette: Palette, names: readonly BucketName[], placements: readonly Placement[]): readonly DropRow[] {
  const dearest = dearestFirst(placements);

  return names.map((name, at) => {
    const one = dearest.find((placement) => placement.bucket === name);
    return one === undefined ? { id: `vacant|${name}`, bucket: name, style: tierStyle(palette, name) } : dropRow(palette, one, at);
  });
}
