import type { Condition } from "@poe/filter-compile/types";
import type { FilterItem } from "@poe/filter-eval/filter-ast";

export type SampleValue = string | number | boolean | readonly string[];

/** One sample per value, or the value read off the row. */
export type SampleProperty =
  | { readonly values: readonly SampleValue[] }
  | { readonly from: "name" | "baseTypes" | "conditions" };

/** Keyed by filter condition name. Its samples are the cartesian product. */
export type SampleSet = Readonly<Record<string, SampleProperty>>;

/** What the validator reads off a category record. */
export type SampleCategory = {
  readonly conditions: readonly Condition[];
  readonly samples?: readonly SampleSet[];
  /** Overrides on each sample; its own path must not take the result. */
  readonly rejects?: readonly SampleSet[];
  /** May overlap its category's other rows. */
  readonly catchAll?: boolean;
  readonly order?: number;
};

export type SampleCategories = Readonly<Record<string, SampleCategory>>;

/** What the validator reads off a catalog row. */
export type SampleRow = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly baseTypes: readonly string[];
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly { readonly name: string; readonly conditions?: readonly Condition[] }[];
};

export type Sample = {
  readonly row: SampleRow;
  readonly item: FilterItem;
  /** The override that built it, on a reject sample. */
  readonly reject?: string;
};

export type UnfilteredRow = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly samples: readonly FilterItem[];
};

export type UnfilteredReport = {
  /** Every sample built. */
  readonly sampled: number;
  /** Samples no block took. */
  readonly unfiltered: number;
  /** Category paths holding rows but no sample sets. */
  readonly unsampled: readonly string[];
  readonly rows: readonly UnfilteredRow[];
};

/** Samples of one own path that another path took or also matched. */
export type PathPair = {
  readonly own: string;
  /** The other path, or `""` for own-miss with no match at all. */
  readonly other: string;
  readonly count: number;
  readonly example: {
    readonly ownKey: string;
    readonly otherKey: string;
    readonly item: FilterItem;
  };
};

export type FallThroughReport = {
  readonly sampled: number;
  /** Nothing matched. */
  readonly unfiltered: number;
  /** No row on its own path matched; `other` is the winner. */
  readonly ownMiss: readonly PathPair[];
  /** Its own path matched, another path won. */
  readonly fallThrough: readonly PathPair[];
  /** Its own path won, another non-catch-all path also matched. */
  readonly overlap: readonly PathPair[];
  /** A reject sample its own path took. */
  readonly rejected: readonly RejectedGroup[];
  /** Its own path won with a block that never asks a property the samples vary. */
  readonly blind: readonly BlindGroup[];
};

/** Reject samples of one path, one override, that the path took. */
export type RejectedGroup = {
  readonly path: string;
  readonly reject: string;
  readonly count: number;
  readonly example: { readonly key: string; readonly variant: string; readonly item: FilterItem };
};

/** Samples of one path whose winning block ignores one varied property. */
export type BlindGroup = {
  readonly path: string;
  readonly property: string;
  readonly count: number;
  readonly example: { readonly key: string; readonly variant: string; readonly item: FilterItem };
};
