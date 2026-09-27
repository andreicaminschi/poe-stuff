import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import type { SampleRow } from "../types.ts";

export type Bucket = "ownMiss" | "fallThrough" | "overlap";

export type Hit = {
  readonly bucket: Bucket;
  readonly own: SampleRow;
  readonly other: SampleRow | undefined;
  readonly item: FilterItem;
};

export type Flagged = { readonly row: SampleRow; readonly block: FilterBlock; readonly item: FilterItem };

export type Blind = Flagged & { readonly property: string };

export type Rejected = Flagged & { readonly reject: string };
