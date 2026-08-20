import { CONDITIONS, NEGATING_OPERATORS, SOCKET_COLOURS } from "./filter-ast.ts";
import type {
  ApplyKey,
  Contribution,
  EvalResult,
  FilterBlock,
  FilterCondition,
  FilterItem,
  Operator,
  SocketColour,
  SocketSpec,
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

/** Every socket letter in a string, upper-cased, ignoring spaces and anything else. */
const lettersOf = (group: string): SocketColour[] =>
  [...group.toUpperCase()].filter((char): char is SocketColour =>
    (SOCKET_COLOURS as readonly string[]).includes(char),
  );

/**
 * Whether one run of sockets satisfies the spec. The operator decides the count; colours
 * are always "at least", so `RGB` asks for a group holding one of each and does not care
 * what else is in there.
 */
const satisfies = (
  letters: readonly SocketColour[],
  spec: SocketSpec,
  operator: Operator,
): boolean => {
  if (spec.count !== undefined && !compare(letters.length, spec.count, operator)) {
    return false;
  }

  for (const [colour, wanted] of Object.entries(spec.colours)) {
    const have = letters.filter((letter) => letter === colour).length;
    if (have < wanted) return false;
  }

  return true;
};

const matchSockets = (condition: FilterCondition, value: unknown): boolean => {
  if (typeof value !== "string" || condition.sockets === undefined) return false;

  // `Sockets` ignores the links, so the whole string is one run. `SocketGroup` asks each
  // linked group on its own and takes the first that answers.
  if (condition.name === "Sockets") {
    return satisfies(lettersOf(value), condition.sockets, condition.operator);
  }

  const spec = condition.sockets;
  return value
    .split(/\s+/)
    .filter((group) => group !== "")
    .some((group) => satisfies(lettersOf(group), spec, condition.operator));
};

const matchCounted = (condition: FilterCondition, value: unknown): boolean => {
  const mods = asList(value);
  if (mods === undefined) return false;

  const have = mods.map((mod) => mod.toLowerCase());
  // How many of the listed names are present, not how many of the item's mods matched. The
  // sample writes `"Elevated "` with a trailing space, which only works if this is a
  // substring test.
  const hits = condition.values.filter((wanted) =>
    have.some((mod) => mod.includes(wanted.toLowerCase())),
  ).length;

  return compare(hits, condition.count ?? 1, condition.operator);
};

const matchGem = (condition: FilterCondition, value: unknown): boolean => {
  if (typeof value !== "string") return false;

  const wanted = condition.values[0] ?? "";
  const lower = wanted.toLowerCase();

  // `TransfiguredGem True` asks whether it is one at all; a name asks which.
  if (lower === "true" || lower === "false") {
    const transfigured = value !== "";
    const same = transfigured === (lower === "true");
    return negated(condition.operator) ? !same : same;
  }

  const have = value.toLowerCase();
  const same = condition.operator === "==" ? have === lower : have.includes(lower);
  return negated(condition.operator) ? !same : same;
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
    case "sockets":
      return matchSockets(condition, value);
    case "counted":
      return matchCounted(condition, value);
    case "gem":
      return matchGem(condition, value);
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
