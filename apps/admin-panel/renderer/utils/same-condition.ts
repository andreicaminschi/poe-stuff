import type { Condition } from "../../api/taxonomy/types.ts";

const keyOf = (condition: Condition): string =>
  JSON.stringify([condition.condition, condition.operator ?? "==", condition.value ?? null, condition.from ?? null]);

/** Whether two conditions say the same thing: name, operator, value and from. */
export const sameCondition = (a: Condition, b: Condition): boolean => keyOf(a) === keyOf(b);
