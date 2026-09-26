import type { ListingMatch } from "../../api/taxonomy/types.ts";

/** Whether two selectors write the same keys with the same values, name aside. */
export function sameListing(a: ListingMatch | undefined, b: ListingMatch | undefined): boolean {
  const { name: _a, ...left } = a ?? {};
  const { name: _b, ...right } = b ?? {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]) as Set<keyof typeof left>;

  return [...keys].every((key) => left[key] === right[key]);
}
