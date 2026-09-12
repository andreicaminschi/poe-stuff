import type { ListingMatch } from "../../api/taxonomy/types.ts";

/** Whether two selectors write the same keys with the same values, name aside. */
export function sameListing(a: ListingMatch | undefined, b: ListingMatch | undefined): boolean {
  const { name: _a, ...left } = a ?? {};
  const { name: _b, ...right } = b ?? {};
  const keys = Object.keys(left) as (keyof typeof left)[];

  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}
