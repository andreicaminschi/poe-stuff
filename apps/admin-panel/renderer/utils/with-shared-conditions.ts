import type { Condition, Item } from "../../api/taxonomy/types.ts";
import { sameCondition } from "./same-condition.ts";

/** The item with the old shared conditions swapped for the new ones. Its own extras stay. */
export const withSharedConditions = (item: Item, before: readonly Condition[], after: readonly Condition[]): Item => ({
  ...item,
  conditions: [
    ...item.conditions.filter((condition) => !before.some((shared) => sameCondition(shared, condition))),
    ...after,
  ],
});
