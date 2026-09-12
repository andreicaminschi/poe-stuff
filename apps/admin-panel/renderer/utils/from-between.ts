import type { Condition } from "../../api/taxonomy/types.ts";

/** A between pair back to one condition: the low bound, under `operator`. */
export function fromBetween(
  conditions: readonly Condition[],
  low: number,
  high: number,
  operator: string,
): readonly Condition[] {
  return conditions.flatMap((condition, at) => {
    if (at === high) return [];
    if (at === low) return [{ ...condition, operator }];
    return [condition];
  });
}
