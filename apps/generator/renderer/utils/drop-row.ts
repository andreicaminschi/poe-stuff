import { tierStyle } from "@poe/filter-style/tier-style";
import type { Palette, Placement } from "@poe/filter-style/types";
import type { DropRow } from "../components/drop-table.tsx";
import { worthText } from "./worth-text.ts";

export const dropRow = (palette: Palette, one: Placement, at: number): DropRow => ({
  id: `${one.item.name}|${one.bucket}|${at}`,
  bucket: one.bucket,
  style: tierStyle(palette, one.bucket, one.verb),
  won: one.won,
  name: one.item.name,
  worth: worthText(one),
  reason: one.reason,
});
