import type { Listing } from "../../api/taxonomy/types.ts";

export function withListing<T extends { readonly listing?: Listing }>(row: T, listing: Listing | undefined): T {
  const { listing: _drop, ...rest } = row;

  return (listing === undefined ? rest : { ...rest, listing }) as T;
}
