import { CONDITIONS, NEGATING_OPERATORS } from "./filter-ast.ts";
import type {
  ApplyKey,
  Contribution,
  EvalResult,
  FilterBlock,
  FilterCondition,
  FilterItem,
  Operator,
} from "./filter-ast.ts";

/**
 * Walk a parsed filter against one item and report what matched.
 *
 * Every matcher starts by reading the item key with the condition name. A missing key is
 * `false` and stays `false` even under `!` — the item parser fills defaults in, so a gap
 * here is a real gap, and guessing what it meant is how a filter silently does the wrong
 * thing.
 */

const negated = (operator: Operator): boolean =>
  (NEGATING_OPERATORS as readonly string[]).includes(operator);

/** Compare two numbers by operator. `=` and `==` both mean equality on numbers. */
const compare = (have: number, want: number, operator: Operator): boolean => {
  switch (operator) {
    case "=":
    case "==":
      return have === want;
    case "!":
    case "!=":
      return have !== want;
    case "<":
      return have < want;
    case "<=":
      return have <= want;
    case ">":
      return have > want;
    case ">=":
      return have >= want;
  }
};

const asList = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) ? (value as readonly string[]) : undefined;

const matchBoolean = (condition: FilterCondition, value: unknown): boolean => {
  if (typeof value !== "boolean") return false;
  const want = condition.values[0]?.toLowerCase() === "true";
  const same = value === want;
  return negated(condition.operator) ? !same : same;
};

const matchNumeric = (condition: FilterCondition, value: unknown): boolean => {
  if (typeof value !== "number") return false;
  return compare(value, Number(condition.values[0]), condition.operator);
};

const matchOrdered = (condition: FilterCondition, value: unknown): boolean => {
  if (typeof value !== "string") return false;

  const entry = CONDITIONS[condition.name];
  if (!("order" in entry)) return false;

  // `Rarity Normal Magic Rare` is any-of by name. Only the comparison operators actually
  // walk the ladder, and the parser has already held those to one value.
  if (!negated(condition.operator) && condition.operator !== "=" && condition.operator !== "==") {
    const index = (of: string): number =>
      entry.order.findIndex((step) => step.toLowerCase() === of.toLowerCase());

    const have = index(value);
    const want = index(condition.values[0] ?? "");
    // An item value the ladder does not know is not above or below anything on it.
    if (have === -1 || want === -1) return false;

    return compare(have, want, condition.operator);
  }

  const any = condition.values.some(
    (wanted) => wanted.toLowerCase() === value.toLowerCase(),
  );
  return negated(condition.operator) ? !any : any;
};

const matchStrings = (condition: FilterCondition, value: unknown): boolean => {
  if (typeof value !== "string") return false;

  const have = value.toLowerCase();
  // Plain `=` matches part of the name, `==` matches the whole name. This is what the game
  // does, and it is the one rule the syntax doc does not spell out.
  const exact = condition.operator === "==";
  const any = condition.values.some((wanted) => {
    const want = wanted.toLowerCase();
    return exact ? have === want : have.includes(want);
  });

  return negated(condition.operator) ? !any : any;
};

const matchEnums = (condition: FilterCondition, value: unknown): boolean => {
  const list = asList(value);
  if (list === undefined) return false;

  const have = list.map((one) => one.toLowerCase());
  const any = condition.values.some((wanted) => {
    const want = wanted.toLowerCase();
    // `HasInfluence None` asks for an item carrying no influence at all, so it is the empty
    // list that matches it, not a list holding the word.
    if (want === "none") return have.length === 0;
    return have.includes(want);
  });

  return negated(condition.operator) ? !any : any;
};

const matchCondition = (condition: FilterCondition, item: FilterItem): boolean => {
  const value = item[condition.name];

  switch (condition.kind) {
    case "boolean":
      return matchBoolean(condition, value);
    case "numeric":
      return matchNumeric(condition, value);
    case "ordered":
      return matchOrdered(condition, value);
    case "strings":
      return matchStrings(condition, value);
    case "enums":
      return matchEnums(condition, value);
    default:
      // The parser rejects these, so reaching here means a block was built by hand.
      throw new Error(
        `line ${condition.line}: ${condition.name} is not supported yet: ` +
          `${condition.kind} conditions are stage 2`,
      );
  }
};

export function evaluateFilter(
  blocks: readonly FilterBlock[],
  item: FilterItem,
): EvalResult {
  const notes: Partial<Record<ApplyKey, string>> = {};
  const contributions: Contribution[] = [];

  for (const block of blocks) {
    if (!block.conditions.every((condition) => matchCondition(condition, item))) continue;

    for (const note of block.notes) {
      // Tagged with the block header, not the note line, so a failing test can name the
      // block that set the key.
      contributions.push({ key: note.key, value: note.value, line: block.line });
      notes[note.key] = note.value;
    }

    if (!block.continues) return { verdict: block.keyword, notes, contributions };
  }

  // Nothing stopped the walk — either nothing matched, or the last block that did said
  // `Continue` and there was nothing after it.
  return { verdict: "none", notes, contributions };
}
