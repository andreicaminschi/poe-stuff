import type { ListingMatch } from "../../api/taxonomy/types.ts";

export function withListing<T extends { readonly listing?: ListingMatch }>(
  row: T,
  listing: ListingMatch | undefined,
): T {
  const { listing: _drop, ...rest } = row;

  return (listing === undefined ? rest : { ...rest, listing }) as T;
}
