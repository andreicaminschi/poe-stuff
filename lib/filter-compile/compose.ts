import type { Condition, Layer, RemovedCondition, ResolvedCondition } from "./types.ts";

const keyOf = (condition: Condition): string => `${condition.condition} ${condition.operator ?? "=="}`;

export type Composed = {
  /** What reaches the item, each with the levels it overrode. */
  readonly applied: readonly ResolvedCondition[];
  /** What a lower level removed, and which level removed it. */
  readonly removed: readonly RemovedCondition[];
};

/**
 * The layers laid over each other, lowest last, with a record of what happened.
 *
 * A condition replaces an earlier one with the same name and operator, so `GemLevel >= 3` and
 * `GemLevel <= 4` both survive, and the replacement lists the levels it overrode. A `null`
 * value removes the earlier one, adds nothing, and the earlier one is kept in `removed`.
 */
export function composeTrace(layers: readonly Layer[]): Composed {
  const byKey = new Map<string, ResolvedCondition>();
  const removed = new Map<string, RemovedCondition>();

  for (const { level, conditions } of layers) {
    for (const condition of conditions) {
      const key = keyOf(condition);
      const earlier = byKey.get(key);

      if (condition.value === null) {
        if (earlier === undefined) continue;
        const { overrides: _overridden, ...gone } = earlier;
        removed.set(key, { ...gone, removedBy: level });
        byKey.delete(key);
        continue;
      }

      byKey.set(key, {
        ...condition,
        level,
        ...(earlier === undefined ? {} : { overrides: [...(earlier.overrides ?? []), earlier.level] }),
      });
    }
  }

  return { applied: [...byKey.values()], removed: [...removed.values()] };
}

/** Only what reaches the item. */
export const compose = (layers: readonly Layer[]): readonly ResolvedCondition[] => composeTrace(layers).applied;
