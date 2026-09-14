import type { Item } from "../../api/taxonomy/types.ts";
import type { View } from "../types.ts";
import { listingsOf } from "./listings-of.ts";

const linked = (listing: Item["listing"]): boolean => listingsOf(listing).length > 0;

const untouched = (row: Item): boolean =>
  row.excluded !== true &&
  row.quest !== true &&
  row.unpriceable !== true &&
  !linked(row.listing) &&
  !row.variants.some((variant) => linked(variant.listing));

/** Whether a row belongs on one tab of the category list. Untouched is nobody's decision yet. */
export function rowInView(row: Item, view: View): boolean {
  if (view === "untouched") return untouched(row);

  return (row.excluded === true) === (view === "excluded");
}
