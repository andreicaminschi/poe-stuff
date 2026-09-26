import type { Item } from "../../api/taxonomy/types.ts";
import { withTrueFlag } from "./with-true-flag.ts";

export const withExcluded = (item: Item, excluded: boolean): Item => withTrueFlag(item, "excluded", excluded);
