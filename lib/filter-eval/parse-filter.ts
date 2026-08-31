import {
  ACTIONS,
  APPLY_KEYS,
  CONDITIONS,
  CONDITIONS_BY_LOWER,
  EQUALITY_OPERATORS,
  NEGATING_OPERATORS,
  REQUIRED_KEYS,
  SOCKET_COLOURS,
} from "./filter-ast.ts";
import type {
  ApplyKey,
  ConditionName,
  FilterBlock,
  FilterCondition,
  Keyword,
  Note,
  Operator,
  SocketColour,
  SocketSpec,
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

/** A note key. Deliberately narrow — the note format has one spelling. */
const NOTE_KEY = /^[a-z][a-z0-9-]*$/;

/**
 * A line and the comment trailing it.
 *
 * An extra condition the generation phase adds is a real condition line, not a marker of
 * its own — a marker would be a comment, the game would skip it, and the filter being
 * validated would not be the filter that runs. So provenance rides along in an ordinary
 * trailing comment, which is kept here rather than thrown away.
 */
type Split = { code: string; comment: string };

/** A block under construction. Same shape as `FilterBlock`, minus the `readonly`. */
type BlockDraft = {
  keyword: Keyword;
  conditions: FilterCondition[];
  notes: Note[];
  comment: string;
  freehand: string;
  continues: boolean;
  line: number;
  /** Set once the `#@` line is read. Nothing may follow it. */
  closed: boolean;
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
const splitComment = (raw: string): Split => {
  let quoted = false;

  for (let at = 0; at < raw.length; at += 1) {
    const char = raw[at];
    if (char === '"') quoted = !quoted;
    else if (char === "#" && !quoted) {
      return { code: raw.slice(0, at), comment: raw.slice(at + 1).trim() };
    }
  }

  return { code: raw, comment: "" };
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

/** A count glued to its operator, the way `HasExplicitMod >=2` writes it. */
const GLUED_COUNT = /^(==|!=|>=|<=|=|!|<|>)(\d+)$/;

/** A socket spec: a count, some colour letters, or both. `5GGG`, `6`, `AAAA`, `RGB`. */
const SOCKET_SPEC = /^(\d+)?([A-Za-z]*)$/;

/**
 * Read `5GGG` into a count of five and three greens. Either half may be missing, but not
 * both — the sample writes `Sockets >= 3` and `Sockets >= AAAA` about equally.
 */
const parseSocketSpec = (
  name: ConditionName,
  values: readonly string[],
  line: number,
): SocketSpec => {
  const value = requireOneValue(name, values, line);
  const found = SOCKET_SPEC.exec(value);
  const digits = found?.[1];
  const letters = found?.[2] ?? "";

  if (found === null || (digits === undefined && letters === "")) {
    fail(line, `${name} takes a count and colours, got ${JSON.stringify(value)}`);
  }

  const colours: Partial<Record<SocketColour, number>> = {};
  for (const letter of letters.toUpperCase()) {
    if (!(SOCKET_COLOURS as readonly string[]).includes(letter)) {
      fail(
        line,
        `${name} does not know the socket colour ${JSON.stringify(letter)}: ` +
          `it takes ${SOCKET_COLOURS.join(", ")}`,
      );
    }
    const colour = letter as SocketColour;
    colours[colour] = (colours[colour] ?? 0) + 1;
  }

  return digits === undefined ? { colours } : { count: Number(digits), colours };
};

const parseCondition = (
  name: ConditionName,
  rest: string,
  line: number,
  comment: string,
): FilterCondition => {
  const entry = CONDITIONS[name];
  const { kind } = entry;

  const tokens = tokenize(rest, line);

  // A counted line may glue its count to its operator: `HasExplicitMod >=2 "of Haast"`,
  // and `HasExplicitMod =0 "..."` for none of them. The sample writes it that way 111
  // times and spaces it out never, but the syntax doc spaces it, so both are read.
  const head = tokens[0];
  const glued = kind === "counted" && head !== undefined ? GLUED_COUNT.exec(head) : null;

  let operator: Operator;
  let values: readonly string[];
  let count: number | undefined;

  if (glued !== null) {
    operator = glued[1] as Operator;
    count = Number(glued[2]);
    values = tokens.slice(1);
  } else {
    const hasOperator = head !== undefined && OPERATORS.has(head);
    operator = (hasOperator ? head : "=") as Operator;
    values = tokens.slice(hasOperator ? 1 : 0);

    // Spaced form. Only a written operator introduces a count, so a bare leading number
    // stays a name — nothing in the grammar says `HasEnchantment 2 "x"` means anything.
    const next = values[0];
    if (kind === "counted" && hasOperator && next !== undefined && /^\d+$/.test(next)) {
      count = Number(next);
      values = values.slice(1);
    }
  }

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
    case "sockets": {
      const spec = parseSocketSpec(name, values, line);
      return { name, kind, operator, values, sockets: spec, comment, line };
    }
    case "counted": {
      if (count !== undefined) {
        return { name, kind, operator, values, count, comment, line };
      }
      // No count written. `HasExplicitMod "A" "B"` wants one or more of them, and the
      // negated form wants none — which is the same thing the sample spells `=0`.
      const negating = (NEGATING_OPERATORS as readonly string[]).includes(operator);
      return negating
        ? { name, kind, operator: "=", values, count: 0, comment, line }
        : { name, kind, operator: ">=", values, count: 1, comment, line };
    }
    case "gem": {
      // Either True/False or a gem name, so the only check is that there is one of them.
      requireOneValue(name, values, line);
      requireEqualityOperator(name, operator, line);
      break;
    }
  }

  return { name, kind, operator, values, comment, line };
};

/**
 * Read one `#@` line into its pairs and its freehand tail.
 *
 * Pairs come first. The freehand begins at the first token with no `=` in it and runs to
 * the end of the line, kept verbatim. A token that has an `=` but is not a well-formed pair
 * throws rather than starting the freehand, so `Tier=T1` and `verb=Take` are caught instead
 * of being quietly swallowed as prose.
 */
const parseNote = (
  rest: string,
  line: number,
): { pairs: Note[]; freehand: string } => {
  const pairs: Note[] = [];
  let freehand = "";
  let at = 0;

  while (at < rest.length) {
    while (at < rest.length && /\s/.test(rest[at] ?? "")) at += 1;
    if (at >= rest.length) break;

    const start = at;
    while (at < rest.length && rest[at] !== "=" && !/\s/.test(rest[at] ?? "")) at += 1;

    // No `=` before the whitespace ran out, so the debug comment starts here.
    if (rest[at] !== "=") {
      const token = rest.slice(start, at);
      if (token.includes("=")) fail(line, `bad note pair ${JSON.stringify(token)}`);
      freehand = rest.slice(start).trim();
      break;
    }

    const key = rest.slice(start, at);
    at += 1;

    // A quoted value so a condition can hold spaces: `cond="AreaLevel >= 68"`.
    let value: string;
    if (rest[at] === '"') {
      const close = rest.indexOf('"', at + 1);
      if (close === -1) fail(line, `unterminated quote in note ${JSON.stringify(rest.trim())}`);
      value = rest.slice(at + 1, close);
      at = close + 1;
    } else {
      const from = at;
      while (at < rest.length && !/\s/.test(rest[at] ?? "")) at += 1;
      value = rest.slice(from, at);
    }

    if (!NOTE_KEY.test(key) || value === "") {
      fail(line, `bad note pair ${JSON.stringify(`${key}=${value}`)}`);
    }

    if (!Object.hasOwn(APPLY_KEYS, key)) {
      fail(line, `unknown note key ${JSON.stringify(key)}`);
    }

    const allowed = APPLY_KEYS[key as ApplyKey] as readonly string[];
    if (!allowed.includes(value)) {
      fail(line, `${key} takes one of ${allowed.join(", ")}, got ${JSON.stringify(value)}`);
    }

    pairs.push({ key: key as ApplyKey, value, line });
  }

  for (const required of REQUIRED_KEYS) {
    if (!pairs.some((pair) => pair.key === required)) {
      fail(line, `a #@ note needs ${REQUIRED_KEYS.join(" and ")}, and this one has no ${required}`);
    }
  }

  return { pairs, freehand };
};

export function parseFilter(text: string): FilterBlock[] {
  const blocks: FilterBlock[] = [];
  let current: BlockDraft | undefined;

  const requireBlock = (line: number, what: string): BlockDraft => {
    if (current === undefined) fail(line, `${what} before any Show, Hide or Minimal block`);
    const block = current as BlockDraft;
    // The `#@` line ends the block. Anything after it would be a line the note does not
    // describe, which defeats the point of the note being the block's summary.
    if (block.closed) {
      fail(line, `${what} after the #@ note, which has to be the block's last line`);
    }
    return block;
  };

  /** Every block has to have said what it is for before the next one starts. */
  const close = (block: BlockDraft, at: number): void => {
    if (!block.closed) {
      fail(at, `the block on line ${block.line} has no #@ note, and every block needs one`);
    }
    blocks.push(block);
  };

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return;

    const { code: rawCode, comment } = splitComment(raw);
    const code = rawCode.trim();

    // Nothing but a comment. A note has to be the whole line, so this is the only place one
    // is read — a `#@` trailing a condition is a comment like any other.
    if (code === "") {
      // Strictly `#@` then a space. `#@tier=T1` is a plain comment and stays ignored — no
      // fuzzy prefix matching. A bare `#@` is an empty note rather than a comment, and
      // throws, because silently swallowing it is exactly what this format exists to stop.
      const isNote = trimmed === "#@" || trimmed.startsWith("#@ ");
      if (!isNote) return;

      const block = requireBlock(line, "a #@ note");
      const { pairs, freehand } = parseNote(trimmed.slice(2), line);
      block.notes.push(...pairs);
      block.freehand = freehand;
      block.closed = true;
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
      if (current !== undefined) close(current, line);
      current = {
        keyword,
        conditions: [],
        notes: [],
        comment,
        freehand: "",
        continues: false,
        line,
        closed: false,
      };
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
      block.conditions.push(parseCondition(name, rest, line, comment));
      return;
    }

    // Actions never change what matches, so their values are skipped — but they still have
    // to sit inside a block and before its note, or the note is not describing them.
    if (ACTIONS.has(lower)) {
      requireBlock(line, `the action ${head}`);
      return;
    }

    fail(line, `unknown condition ${JSON.stringify(head)}`);
  });

  if (current !== undefined) close(current, text.split(/\r?\n/).length);
  return blocks;
}
