import type { Condition } from "../../api/taxonomy/types.ts";

export type ConditionRow =
  | { readonly kind: "single"; readonly index: number; readonly condition: Condition }
  | {
      readonly kind: "between";
      readonly low: number;
      readonly high: number;
      readonly from: Condition;
      readonly to: Condition;
    };

const OPPOSITE: Readonly<Record<string, string>> = { ">=": "<=", "<=": ">=" };

/** Conditions as editor rows, with a `>=` and `<=` pair on one number read as one "between". */
export function betweenRows(conditions: readonly Condition[]): readonly ConditionRow[] {
  const paired = new Set<number>();
  const rows: ConditionRow[] = [];

  conditions.forEach((condition, index) => {
    if (paired.has(index)) return;

    const partnerOperator = typeof condition.value === "number" ? OPPOSITE[condition.operator ?? ""] : undefined;
    const partner = conditions.findIndex(
      (other, at) =>
        partnerOperator !== undefined &&
        at > index &&
        !paired.has(at) &&
        other.condition === condition.condition &&
        other.operator === partnerOperator &&
        typeof other.value === "number",
    );
    const other = conditions[partner];

    if (other === undefined) {
      rows.push({ kind: "single", index, condition });
      return;
    }

    paired.add(partner);
    rows.push(
      condition.operator === ">="
        ? { kind: "between", low: index, high: partner, from: condition, to: other }
        : { kind: "between", low: partner, high: index, from: other, to: condition },
    );
  });

  return rows;
}
