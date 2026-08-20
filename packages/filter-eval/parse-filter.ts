import {
  ACTIONS,
  APPLY_KEYS,
  CONDITIONS,
  CONDITIONS_BY_LOWER,
  EQUALITY_OPERATORS,
  STAGE_1_KINDS,
} from "./filter-ast.ts";
import type {
  ApplyKey,
  ConditionName,
  FilterBlock,
  FilterCondition,
  Keyword,
  Note,
  Operator,
} from "./filter-ast.ts";

/**
 * Filter text to blocks. Conditions and `#@` notes only — actions are recognised and
 * skipped, because nothing they do changes what matches.
 *
 * Everything it cannot make sense of throws, naming the line. That is the point: a filter
 * that quietly matches nothing is far harder to notice than one that refuses to load.
 */

/** The game matches case-insensitively, so every keyword is looked up lowercased. */
const KEYWORDS: ReadonlyMap<string, Keyword> = new Map([
  ["show", "Show"],
  ["hide", "Hide"],
  ["minimal", "Minimal"],
]);

const OPERATORS: ReadonlySet<string> = new Set([
  "=",
  "==",
  "!",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
]);

/** One `key=value` pair. Deliberately narrow — the note format has one spelling. */
const NOTE_PAIR = /^[a-z][a-z0-9-]*=[^\s]+$/;

/** A block under construction. Same shape as `FilterBlock`, minus the `readonly`. */
type BlockDraft = {
  keyword: Keyword;
  conditions: FilterCondition[];
  notes: Note[];
  continues: boolean;
  line: number;
};

const fail = (line: number, message: string): never => {
  throw new Error(`line ${line}: ${message}`);
};

/**
 * The part of a line before its comment. A `#` inside quotes is part of a value, not the
 * start of a comment.
 *
 * Real filters put a comment after the block header — the NeverSink sample does it 784
 * times, as `Show # %D8 $type->6l` — so a trailing comment has to be dropped from every
 * line rather than only recognised on lines that are nothing else.
 */
const codeOf = (raw: string): string => {
  let quoted = false;

  for (let at = 0; at < raw.length; at += 1) {
    const char = raw[at];
    if (char === '"') quoted = !quoted;
    else if (char === "#" && !quoted) return raw.slice(0, at);
  }

  return raw;
};

/**
 * Split the part of a line after the condition name into tokens, keeping quoted runs whole.
 * The grammar has no escape sequences, so a double quote is only ever a delimiter.
 */
const tokenize = (rest: string, line: number): string[] => {
  const tokens: string[] = [];
  let at = 0;

  while (at < rest.length) {
    const char = rest[at];
    if (char === undefined) break;

    if (/\s/.test(char)) {
      at += 1;
      continue;
    }

    if (char === '"') {
      const close = rest.indexOf('"', at + 1);
      if (close === -1) fail(line, `unterminated quote in ${JSON.stringify(rest)}`);
      tokens.push(rest.slice(at + 1, close));
      at = close + 1;
      continue;
    }

    let end = at;
    while (end < rest.length) {
      const next = rest[end];
      if (next === undefined || next === '"' || /\s/.test(next)) break;
      end += 1;
    }
    tokens.push(rest.slice(at, end));
    at = end;
  }

  return tokens;
};

const requireEqualityOperator = (
  name: ConditionName,
  operator: Operator,
  line: number,
): void => {
  if (!(EQUALITY_OPERATORS as readonly string[]).includes(operator)) {
    fail(line, `${name} does not take the operator "${operator}"`);
  }
};

const requireOneValue = (
  name: ConditionName,
  values: readonly string[],
  line: number,
): string => {
  const [only] = values;
  if (values.length !== 1 || only === undefined) {
    fail(line, `${name} takes exactly one value, got ${values.length}`);
  }
  return only as string;
};

/** Case-insensitive membership, since the game does not care how a value is spelled. */
const listed = (allowed: readonly string[], value: string): boolean =>
  allowed.some((one) => one.toLowerCase() === value.toLowerCase());

const parseCondition = (name: ConditionName, rest: string, line: number): FilterCondition => {
  const entry = CONDITIONS[name];
  const { kind } = entry;

  // Rejected before the values are looked at, so a stage-2 line never has to tokenize —
  // `HasExplicitMod >=2 "of Haast"` glues its operator to a count and nothing here reads
  // that yet.
  if (!(STAGE_1_KINDS as readonly string[]).includes(kind)) {
    fail(line, `${name} is not supported yet: ${kind} conditions are stage 2`);
  }

  const tokens = tokenize(rest, line);
  const first = tokens[0];
  const hasOperator = first !== undefined && OPERATORS.has(first);
  const operator = (hasOperator ? first : "=") as Operator;
  const values = hasOperator ? tokens.slice(1) : tokens;

  if (values.length === 0) fail(line, `${name} needs at least one value`);

  switch (kind) {
    case "boolean": {
      const value = requireOneValue(name, values, line);
      requireEqualityOperator(name, operator, line);
      if (!listed(["True", "False"], value)) {
        fail(line, `${name} takes True or False, got ${JSON.stringify(value)}`);
      }
      break;
    }
    case "numeric": {
      const value = requireOneValue(name, values, line);
      if (value.trim() === "" || !Number.isFinite(Number(value))) {
        fail(line, `${name} takes a number, got ${JSON.stringify(value)}`);
      }
      break;
    }
    case "ordered": {
      // Two forms. `Rarity > Magic` walks the ladder and needs one value to walk to;
      // `Rarity Normal Magic Rare` is any-of and takes as many as it likes. The NeverSink
      // sample uses the second form on 189 of its 454 Rarity lines.
      if (!(EQUALITY_OPERATORS as readonly string[]).includes(operator)) {
        requireOneValue(name, values, line);
      }
      if ("order" in entry) {
        for (const value of values) {
          if (!listed(entry.order, value)) {
            fail(
              line,
              `${name} takes one of ${entry.order.join(", ")}, got ${JSON.stringify(value)}`,
            );
          }
        }
      }
      break;
    }
    case "enums": {
      requireEqualityOperator(name, operator, line);
      if ("values" in entry) {
        for (const value of values) {
          if (!listed(entry.values, value)) {
            fail(
              line,
              `${name} takes one of ${entry.values.join(", ")}, got ${JSON.stringify(value)}`,
            );
          }
        }
      }
      break;
    }
    case "strings": {
      // No whitelist exists for these — the syntax doc names none.
      requireEqualityOperator(name, operator, line);
      break;
    }
    default:
      fail(line, `${name} is not supported yet: ${kind} conditions are stage 2`);
  }

  return { name, kind, operator, values, line };
};

/**
 * Read one `#@` line into its pairs. The caller has already established that the line is a
 * note and not a plain comment.
 */
const parseNote = (rest: string, line: number): Note[] => {
  const tokens = rest.split(/\s+/).filter((token) => token !== "");
  if (tokens.length === 0) fail(line, "a #@ note needs at least one key=value pair");

  return tokens.map((token) => {
    if (!NOTE_PAIR.test(token)) {
      fail(line, `bad note pair ${JSON.stringify(token)}`);
    }

    const split = token.indexOf("=");
    const key = token.slice(0, split);
    const value = token.slice(split + 1);

    if (!Object.hasOwn(APPLY_KEYS, key)) {
      fail(line, `unknown note key ${JSON.stringify(key)}`);
    }

    const allowed = APPLY_KEYS[key as ApplyKey];
    if (allowed !== null && !(allowed as readonly string[]).includes(value)) {
      fail(
        line,
        `${key} takes one of ${allowed.join(", ")}, got ${JSON.stringify(value)}`,
      );
    }

    return { key: key as ApplyKey, value, line };
  });
};

export function parseFilter(text: string): FilterBlock[] {
  const blocks: FilterBlock[] = [];
  let current: BlockDraft | undefined;

  const requireBlock = (line: number, what: string): BlockDraft => {
    if (current === undefined) fail(line, `${what} before any Show, Hide or Minimal block`);
    return current as BlockDraft;
  };

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return;

    const code = codeOf(raw).trim();

    // Nothing but a comment. A note has to be the whole line, so this is the only place one
    // is read — a `#@` trailing a condition is a comment like any other.
    if (code === "") {
      // Strictly `#@` then a space. `#@tier=T1` is a plain comment and stays ignored — no
      // fuzzy prefix matching. A bare `#@` is an empty note rather than a comment, and
      // throws, because silently swallowing it is exactly what this format exists to stop.
      const isNote = trimmed === "#@" || trimmed.startsWith("#@ ");
      if (!isNote) return;

      const block = requireBlock(line, "a #@ note");
      block.notes.push(...parseNote(trimmed.slice(2), line));
      return;
    }

    const split = /^(\S+)\s*(.*)$/.exec(code);
    const head = split?.[1];
    const rest = split?.[2] ?? "";
    if (head === undefined) return;

    const lower = head.toLowerCase();

    const keyword = KEYWORDS.get(lower);
    if (keyword !== undefined) {
      if (rest !== "") {
        fail(line, `${keyword} takes nothing after it, got ${JSON.stringify(rest)}`);
      }
      if (current !== undefined) blocks.push(current);
      current = { keyword, conditions: [], notes: [], continues: false, line };
      return;
    }

    if (lower === "continue") {
      requireBlock(line, "Continue").continues = true;
      return;
    }

    if (lower === "import") {
      fail(line, "Import is not supported");
    }

    const name = CONDITIONS_BY_LOWER.get(lower);
    if (name !== undefined) {
      const block = requireBlock(line, `the condition ${name}`);
      block.conditions.push(parseCondition(name, rest, line));
      return;
    }

    // Actions never change what matches, so they are skipped — but only the ones that are
    // really actions. Anything else is a typo and has to be heard about.
    if (ACTIONS.has(lower)) return;

    fail(line, `unknown condition ${JSON.stringify(head)}`);
  });

  if (current !== undefined) blocks.push(current);
  return blocks;
}
