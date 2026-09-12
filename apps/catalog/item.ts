import type { Condition, Listing, TaxonomyVariant } from "@poe/taxonomy/types";

/** A taxonomy variant, with the Chaos mean of the listing its selector picked. */
export type PricedVariant = TaxonomyVariant & {
  readonly meanPrice?: number;
  /** PoeWatch's own flag on that listing: a small sample or high variance stands behind it. */
  readonly lowConfidence?: boolean;
};

/**
 * One unique, as PoeWatch lists it, on the base it rolls on.
 *
 * `name` is the listing's own — `Headhunter`, `Foulborn Headhunter (Culling)`,
 * `Lightpoacher (2 Sockets)`, `Wurm's Molt (#% increased Pride Aura Effect)` — because the
 * listing is the form and the form is what has a price. A corrupted entry is a corruption
 * outcome on the listing before it, named by the implicit it rolled.
 */
export type UniqueListing = {
  readonly name: string;
  /** Chaos, a listing price. */
  readonly meanPrice: number;
  readonly corrupted: boolean;
  /** PoeWatch's own flag on this listing: a small sample or high variance stands behind it. */
  readonly lowConfidence?: boolean;
};

/**
 * The uniques on a base that one block draws: every listing filed under one category path.
 *
 * The path is the whole point. A foulborn unique and a plain one are told apart on the
 * ground by a condition, and which condition is the taxonomy's to author under this path.
 */
export type UniqueGroup = {
  readonly category: string;
  readonly subcategory: string | null;
  readonly listings: readonly UniqueListing[];
};

/**
 * One row of the catalog: a drawable taxonomy row, with what it is worth.
 *
 * **The taxonomy decides which rows exist.** Nothing here invents a row or judges one. A
 * row is in the catalog because the published taxonomy has it and has not excluded it, and
 * the catalog only adds prices and uniques to it.
 *
 * Every field is `readonly`, so a step builds a new row rather than writing into one it was
 * handed.
 */
export type Item = {
  /** The taxonomy key: a metadata id, or `authored/<slug>`. */
  readonly key: string;
  readonly name: string;
  /** The taxonomy's internal name for the row, as information. Pricing and conditions read `name`. */
  readonly displayName?: string;
  readonly category: string;
  readonly subcategory: string | null;
  /** What a filter writes: the row's name, or an authored row's `baseType`. */
  readonly baseTypes: readonly string[];
  /**
   * The conditions the taxonomy authored for this row alone, **copied and not resolved**.
   * Laying the category over the subcategory over the row is compile's job.
   */
  readonly conditions?: readonly Condition[];
  /** The row's priced variants, copied the same way, each with its own mean. */
  readonly variants?: readonly PricedVariant[];
  /** Which PoeWatch listing prices the row, copied from the taxonomy. */
  readonly listing?: Listing;
  /**
   * PoeWatch's mean for the row, in Chaos. A listing price, not a sale price. A row with
   * variants prices each of them and not itself.
   */
  readonly meanPrice?: number;
  /** PoeWatch's own flag on the listing `meanPrice` came from. Absent wherever `meanPrice` is. */
  readonly lowConfidence?: boolean;
  /**
   * Every unique PoeWatch lists on this base, each form of each one, priced, grouped by the
   * category path that says how a filter tells the group apart. **A unique is not a row.**
   */
  readonly uniques?: readonly UniqueGroup[];
};
