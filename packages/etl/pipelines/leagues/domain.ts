/**
 * Contract for the friendly form of the league list. Owned by us, not GGG —
 * everything downstream of `transform.ts` should speak only this.
 */

export type League = {
  /** Unique only together with `realm`. */
  readonly id: string;
  readonly realm: string;
  readonly text: string;
  /** True for the permanent leagues that outlive a temporary league cycle. */
  readonly permanent: boolean;
};

export type Realm = {
  readonly id: string;
  readonly count: number;
  readonly leagues: readonly League[];
};

export type LeagueTotals = {
  readonly realms: number;
  readonly leagues: number;
  /** Distinct league ids, i.e. leagues counted once rather than once per realm. */
  readonly distinctLeagues: number;
};

export type Leagues = {
  readonly totals: LeagueTotals;
  readonly realms: readonly Realm[];
};
