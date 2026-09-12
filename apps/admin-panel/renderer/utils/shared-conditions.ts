import type { Condition, Item } from "../../api/taxonomy/types.ts";
import { sameCondition } from "./same-condition.ts";

/** The conditions every item has, in the first item's order. */
export function sharedConditions(items: readonly Item[]): readonly Condition[] {
  const [first, ...rest] = items;
  if (first === undefined) return [];

  return first.conditions.filter((condition) =>
    rest.every((item) => item.conditions.some((other) => sameCondition(condition, other))),
  );
}
