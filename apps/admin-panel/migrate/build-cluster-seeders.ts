import { readBaseType, type OldCondition, type OldRow } from "./old-taxonomy.ts";
import type { Seeder } from "../types.ts";

/**
 * Reads a cluster row's passive count as one range, the shape a seeder's number condition
 * holds. Undefined when the row sets no complete range. Medium, Sonar 4.
 *
 * @example
 * readPassiveRange([{ condition: "EnchantmentPassiveNum", operator: ">=", value: 9 },
 *   { condition: "EnchantmentPassiveNum", operator: "<=", value: 11 }]);
 * // → [9, 11]
 */
function readPassiveRange(conditions: readonly OldCondition[]): readonly [number, number] | undefined {
  const passiveNums = conditions.filter((c) => c.condition === "EnchantmentPassiveNum");
  const readBound = (operator: string) =>
    passiveNums.find((c) => c.operator === operator)?.value as number | undefined;
  const exact = readBound("==");

  if (exact !== undefined) return [exact, exact];

  const low = readBound(">=");
  const high = readBound("<=");

  return low === undefined || high === undefined
    ? undefined
    : [low, high];
}

/** Lists the enchant names a cluster row's `EnchantmentPassiveNode` conditions hold. Low, dense: Sonar 1. */
const listEnchants = (conditions: readonly OldCondition[]): readonly string[] =>
  conditions
    .filter((c) => c.condition === "EnchantmentPassiveNode")
    .flatMap((c) => [c.value ?? []].flat() as string[]);

/**
 * Builds one seeder per cluster jewel size, holding every enchant and passive-count breakpoint
 * that size's rows name. Medium, Sonar 3.
 */
export function buildClusterSeeders(rows: readonly OldRow[]): readonly Seeder[] {
  const sizes = new Map<string, { enchants: Set<string>; passiveRanges: Map<string, readonly [number, number]> }>();

  for (const row of rows) {
    const size = sizes.get(readBaseType(row)) ?? { enchants: new Set<string>(), passiveRanges: new Map() };
    const conditions = row.conditions ?? [];
    const passiveRange = readPassiveRange(conditions);

    listEnchants(conditions).forEach((enchant) => size.enchants.add(enchant));
    if (passiveRange !== undefined) size.passiveRanges.set(passiveRange.join("-"), passiveRange);
    sizes.set(readBaseType(row), size);
  }

  return [...sizes].map(([baseType, { enchants, passiveRanges }]) => ({
    name: baseType,
    conditions: {
      BaseType: [baseType],
      EnchantmentPassiveNode: [...enchants],
      EnchantmentPassiveNum: [...passiveRanges.values()].sort((a, b) => a[0] - b[0]),
    },
    tags: [],
  }));
}
