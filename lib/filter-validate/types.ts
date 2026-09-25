import type { Condition } from "@poe/filter-compile/types";
import type { FilterItem } from "@poe/filter-eval/filter-ast";

export type SampleValue = string | number | boolean;

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

export type Sample = { readonly row: SampleRow; readonly item: FilterItem };

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
