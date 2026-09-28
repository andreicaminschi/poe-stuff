import type { FromSource, ResolvedCondition } from "./types.ts";

export type Filled = {
  readonly conditions: readonly ResolvedCondition[];
  readonly problems: readonly string[];
};

/** Fills one condition's `from` with the row's name or base types. */
function fillCondition(condition: ResolvedCondition, row: FromSource): ResolvedCondition {
  const { from, ...rest } = condition;

  if (from === "name") return { ...rest, value: row.name };
  if (from === "baseTypes") return { ...rest, value: [...row.baseTypes] };

  return condition;
}

/** Checks the row's name can be written into a `.filter` line. */
function checkName(row: FromSource): readonly string[] {
  if (row.name.length === 0) return ["reads its name, which is empty"];
  if (row.name.includes("\"")) return ["has a quote in its name, which a .filter line cannot hold"];

  return [];
}

/** Checks the row's base types can be written into a `.filter` line. */
function checkBaseTypes(row: FromSource): readonly string[] {
  if (row.baseTypes.length === 0) return ["reads its base types, which are empty"];
  if (row.baseTypes.some((baseType) => baseType.includes("\""))) {
    return ["has a quote in a base type, which a .filter line cannot hold"];
  }

  return [];
}

/**
 * Every `from` filled off the row: `name` with its name, `baseTypes` with its base types.
 *
 * A `from` naming anything else is reported and dropped, so it can never reach a filter
 * line as a condition with no value.
 *
 * @example
 * fillFromRow(
 *   [{ condition: "BaseType", operator: "==", from: "baseTypes", level: "subcategory" },
 *    { condition: "Rarity", from: "rarity", level: "item" }],
 *   { name: "Ruby Ring", baseTypes: ["Ruby Ring"] },
 * );
 * // → { conditions: [{ condition: "BaseType", operator: "==", value: ["Ruby Ring"], level: "subcategory" }],
 * //     problems: ['reads "rarity", which is not name or baseTypes'] }
 */
export function fillFromRow(conditions: readonly ResolvedCondition[], row: FromSource): Filled {
  const readsFrom = (from: string) => conditions.some((condition) => condition.from === from);
  const unknown = conditions.filter(
    (condition) => condition.from !== undefined && condition.from !== "name" && condition.from !== "baseTypes",
  );

  const valueAndFrom = conditions.filter((condition) => condition.from !== undefined && condition.value !== undefined);

  return {
    conditions: conditions
      .filter((condition) => !unknown.includes(condition))
      .map((condition) => fillCondition(condition, row)),
    problems: [
      ...valueAndFrom.map((condition) => `${condition.condition} has both a value and from "${String(condition.from)}"`),
      ...(readsFrom("name")
        ? checkName(row)
        : []),
      ...(readsFrom("baseTypes")
        ? checkBaseTypes(row)
        : []),
      ...unknown.map((condition) => `reads "${String(condition.from)}", which is not name or baseTypes`),
    ],
  };
}
