/**
 * Contract for the friendly form of the items data. Owned by us, not GGG —
 * everything downstream of `transform.ts` should speak only this.
 */

export type Item = {
  /** Category id, e.g. `accessory`. Repeated here so the flat output stands alone. */
  readonly category: string;
  /** Base type, e.g. `Ruby Ring`. Shared by every unique on that base. */
  readonly type: string;
  /** Display text; falls back to `type` for plain bases, which have none. */
  readonly text: string;
  /** Unique name, or null for a plain base. */
  readonly name: string | null;
  readonly unique: boolean;
  /** Variant tag when a name has several forms: `legacy`, `blighted`, ... */
  readonly discriminator: string | null;
};

export type ItemCategory = {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly items: readonly Item[];
};

export type ItemTotals = {
  readonly categories: number;
  readonly items: number;
  readonly unique: number;
  readonly discriminated: number;
  /** Base types shared by more than one entry — the norm, not an anomaly. */
  readonly distinctTypes: number;
};

export type Items = {
  readonly totals: ItemTotals;
  readonly categories: readonly ItemCategory[];
};
