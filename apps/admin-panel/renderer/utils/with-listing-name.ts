import type { ListingMatch } from "../../api/taxonomy/types.ts";

export function withListingName(listing: ListingMatch | undefined, name: string): ListingMatch | undefined {
  const { name: _drop, ...rest } = listing ?? {};
  const next = name.trim() === "" ? rest : { ...rest, name: name.trim() };

  return Object.keys(next).length === 0 ? undefined : next;
}
