import type { FromSource, ResolvedCondition } from "./types.ts";

export type Filled = {
  readonly conditions: readonly ResolvedCondition[];
  readonly problems: readonly string[];
};

function filled(condition: ResolvedCondition, row: FromSource): ResolvedCondition {
  const { from, ...rest } = condition;

  if (from === "name") return { ...rest, value: row.name };
  if (from === "baseTypes") return { ...rest, value: [...row.baseTypes] };

  return condition;
}

function nameProblems(row: FromSource): readonly string[] {
  if (row.name.length === 0) return ["reads its name, which is empty"];
  if (row.name.includes('"')) return ["has a quote in its name, which a .filter line cannot hold"];

  return [];
}

function baseTypeProblems(row: FromSource): readonly string[] {
  if (row.baseTypes.length === 0) return ["reads its base types, which are empty"];
  if (row.baseTypes.some((baseType) => baseType.includes('"'))) {
    return ["has a quote in a base type, which a .filter line cannot hold"];
  }

  return [];
}

/**
 * Every `from` filled off the row: `name` with its name, `baseTypes` with its base types.
 *
 * A `from` naming anything else is left as it is and reported, so it can never reach a filter
 * line as a condition with no value.
 */
export function fillFrom(conditions: readonly ResolvedCondition[], row: FromSource): Filled {
  const reads = (from: string) => conditions.some((condition) => condition.from === from);
  const unknown = conditions.filter(
    (condition) => condition.from !== undefined && condition.from !== "name" && condition.from !== "baseTypes",
  );

  return {
    conditions: conditions.map((condition) => filled(condition, row)),
    problems: [
      ...(reads("name") ? nameProblems(row) : []),
      ...(reads("baseTypes") ? baseTypeProblems(row) : []),
      ...unknown.map((condition) => `reads "${String(condition.from)}", which is not name or baseTypes`),
    ],
  };
}
