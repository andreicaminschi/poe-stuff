/** How an item earns its place in a bucket. */
export type Verb = "take" | "check" | "gamble";

/**
 * One tier: what it pays, and whether an item may reach it by corruption.
 *
 * `ceiling` is exclusive, and absent means open — the top bucket takes everything above its
 * floor. `gamble` is the bucket's rule, not the item's: a bucket that refuses gambling makes
 * an item fall back to what it is worth without one.
 */
export type Bucket = {
  readonly name: string;
  readonly floor: number;
  readonly ceiling?: number;
  readonly gamble: boolean;
};

/**
 * The three numbers a bucket asks about, in Chaos.
 *
 * `take` is the cheapest form of the row, `check` the dearest, and `gamble` the dearest form
 * that has to be corrupted first. Each is absent when nothing priced it.
 */
export type Prices = {
  readonly take?: number;
  readonly check?: number;
  readonly gamble?: number;
};

export type Placement = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly bucket: string;
  readonly verb: Verb;
  readonly reason: string;
  readonly prices: Prices;
};

export type Unplaced = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly reason: string;
  readonly prices: Prices;
};

export type Bucketed = {
  readonly placed: readonly Placement[];
  readonly unplaced: readonly Unplaced[];
};

/** What `bucketItems` needs off a catalog row. Declared here, never imported from the catalog. */
export type PricedRow = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly meanPrice?: number;
  readonly lowConfidence?: boolean;
  readonly variants?: readonly {
    readonly name: string;
    readonly meanPrice?: number;
    readonly lowConfidence?: boolean;
    readonly conditions?: readonly { readonly condition: string; readonly value?: unknown }[];
  }[];
};
