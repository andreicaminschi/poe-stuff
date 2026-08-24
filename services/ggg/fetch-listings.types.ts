export type GGGListingsResponseData = { readonly result: readonly unknown[] };

/**
 * Listing rows exactly as GGG sent them. Nothing here asserts their shape — a listing is
 * passed through to whatever writes it down.
 */
export type GGGListingPage = {
  readonly searchId: string;
  readonly page: number;
  readonly listings: readonly unknown[];
};
