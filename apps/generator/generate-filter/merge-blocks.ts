import type { Condition } from "@poe/taxonomy/get-taxonomy.types";
import type { Decision } from "./types.ts";

/** The one condition that names the row, when a decision has exactly one. */
const named = (decision: Decision): Condition | undefined => {
  const fromRow = decision.conditions.filter((one) => one.from !== undefined);
  return fromRow.length === 1 ? fromRow[0] : undefined;
};

/** Everything about a decision except which row it names. Two alike merge. */
const shapeOf = (decision: Decision): string =>
  JSON.stringify({
    tier: decision.tier,
    notes: decision.notes,
    freehand: decision.freehand,
    conditions: decision.conditions.map((one) =>
      one.from === undefined ? one : { condition: one.condition, operator: one.operator, from: one.from },
    ),
  });

const asList = (value: Condition["value"]): readonly string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value : [];

/**
 * Blocks alike in everything but the row they name become one block naming all of them.
 *
 * Two divination cards at the same tier are one `BaseType` line with two names, not two
 * blocks with one look. The row-naming condition is the one `resolveConditions` filled from
 * the row and left `from` on; a decision with none, or with two, stays as it is, because
 * widening two lists at once would match the cross product.
 *
 * Order of first appearance is kept, and the names inside a merged line are sorted.
 */
export function mergeBlocks(decisions: readonly Decision[]): readonly Decision[] {
  const groups = new Map<string, { readonly first: Decision; readonly values: Set<string> }>();
  const order: (string | Decision)[] = [];

  for (const decision of decisions) {
    const name = named(decision);

    if (name === undefined) {
      order.push(decision);
      continue;
    }

    const shape = shapeOf(decision);
    const group = groups.get(shape);

    if (group === undefined) {
      groups.set(shape, { first: decision, values: new Set(asList(name.value)) });
      order.push(shape);
    } else {
      for (const value of asList(name.value)) group.values.add(value);
    }
  }

  return order.map((entry) => {
    if (typeof entry !== "string") return entry;

    const group = groups.get(entry);
    if (group === undefined) throw new Error("a merged shape lost its group");

    const values = [...group.values].sort((a, b) => a.localeCompare(b));

    return {
      ...group.first,
      conditions: group.first.conditions.map((one) =>
        one.from === undefined ? one : { ...one, value: values },
      ),
    };
  });
}
