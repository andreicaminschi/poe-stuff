export type GGGSearchResponseData = {
  readonly id: string;
  readonly complexity: number;
  readonly total: number;
  readonly result: readonly string[];
};

export type GGGListingSearch = {
  readonly searchId: string;
  /** Listing hashes, at most 100 however large `matchCount` is. */
  readonly hashes: readonly string[];
  readonly matchCount: number;
  readonly complexity: number;
};
