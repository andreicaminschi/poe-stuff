import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import { formatCondition, formatNote } from "@poe/filter-eval/format-note";
import type { Condition } from "@poe/taxonomy/get-taxonomy.types";
import type { Decision, Tier } from "./types.ts";

type Kind = (typeof CONDITIONS)[keyof typeof CONDITIONS]["kind"];

const KINDS: Readonly<Record<string, { readonly kind: Kind }>> = CONDITIONS;

/** Kinds whose values are names and are always quoted, spaces or not. */
const QUOTED: ReadonlySet<Kind> = new Set<Kind>(["strings", "counted"]);

/** Kinds written bare on equality: `Corrupted True`, `Rarity Unique`, not `Rarity == Unique`. */
const BARE_ON_EQUALITY: ReadonlySet<Kind> = new Set<Kind>([
  "boolean",
  "ordered",
  "enums",
  "gem",
]);

const EQUALITY = ["=", "=="];

const INDENT = "\t";

/** The values a condition writes, each as text. A removed or unread condition has none. */
function valuesOf(condition: Condition): readonly string[] {
  const { value } = condition;

  if (value === undefined) {
    throw new Error(`${condition.condition} reads from "${condition.from ?? ""}" and was never resolved`);
  }

  if (value === null) {
    throw new Error(`${condition.condition} is a removal and cannot be written`);
  }

  if (typeof value === "boolean") return [value ? "True" : "False"];
  if (typeof value === "number") return [String(value)];
  if (typeof value === "string") return [value];

  return value;
}

/**
 * One condition as the line a filter reads.
 *
 * The grammar's registry says what kind each condition is, and the kind says how the line
 * looks: a `strings` value is always quoted and always carries its operator, because `==`
 * is what makes `BaseType` exact; a boolean or a rarity is written the way the syntax doc
 * spells it, bare, unless the operator is a comparison.
 */
export function renderCondition(condition: Condition): string {
  const spec = KINDS[condition.condition];

  if (spec === undefined) {
    throw new Error(`${condition.condition} is not a condition the grammar knows`);
  }

  const operator = condition.operator ?? "==";
  const values = valuesOf(condition).map((value) =>
    QUOTED.has(spec.kind) || /\s/.test(value) ? `"${value}"` : value,
  );
  const bare = BARE_ON_EQUALITY.has(spec.kind) && EQUALITY.includes(operator);

  return formatCondition(
    [condition.condition, ...(bare ? [] : [operator]), ...values].join(" "),
  );
}

/** One block, in the shape `@poe/filter-eval` reads back: conditions, actions, then the note. */
export function renderBlock(decision: Decision, tiers: readonly Tier[]): string {
  const tier = tiers.find((one) => one.name === decision.tier);

  if (tier === undefined) {
    throw new Error(`tier ${decision.tier} is not in the config`);
  }

  const body = [
    ...decision.conditions.map(renderCondition),
    ...tier.actions,
    formatNote(decision.notes, decision.freehand),
  ];

  return ["Show", ...body.map((line) => `${INDENT}${line}`)].join("\n");
}
