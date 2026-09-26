import type { Item } from "../../api/taxonomy/types.ts";
import { withTrueFlag } from "./with-true-flag.ts";

export const withUnpriceable = (item: Item, unpriceable: boolean): Item =>
  withTrueFlag(item, "unpriceable", unpriceable);
