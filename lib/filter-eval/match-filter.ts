import { matchCondition } from "./evaluate-filter.ts";
import { CONDITIONS, NEGATING_OPERATORS } from "./filter-ast.ts";
import type { ConditionName, FilterBlock, FilterCondition, FilterItem, Operator } from "./filter-ast.ts";

/**
 * The blocks one item matched, in order, and the one that stopped the walk. `winner` is
 * absent when no block without `Continue` matched.
 */
export type FilterMatch = {
  readonly winner?: FilterBlock;
  readonly matched: readonly FilterBlock[];
};

export type FilterMatcher = (item: FilterItem) => FilterMatch;

/** Item values per slot, lowercased where the kind compares text. */
type Slots = unknown[];

type Test = (slots: Slots, item: FilterItem) => boolean;

type Compiled = { readonly block: FilterBlock; readonly tests: readonly Test[] };

const SLOTTED_KINDS = new Set(["boolean", "numeric", "ordered", "strings", "enums", "gem"]);

const isNegated = (operator: Operator): boolean => (NEGATING_OPERATORS as readonly string[]).includes(operator);

const comparer = (operator: Operator): ((have: number, want: number) => boolean) => {
  switch (operator) {
    case "=":
    case "==":
      return (have, want) => have === want;
    case "!":
    case "!=":
      return (have, want) => have !== want;
    case "<":
      return (have, want) => have < want;
    case "<=":
      return (have, want) => have <= want;
    case ">":
      return (have, want) => have > want;
    case ">=":
      return (have, want) => have >= want;
  }
};

const prepare = (condition: FilterCondition, value: unknown): unknown => {
  switch (condition.kind) {
    case "strings":
    case "ordered":
    case "gem":
      return typeof value === "string" ? value.toLowerCase() : undefined;
    case "enums":
      return Array.isArray(value) ? (value as readonly string[]).map((one) => one.toLowerCase()) : undefined;
    default:
      return value;
  }
};

const booleanTest = (condition: FilterCondition, slot: number): Test => {
  const want = condition.values[0]?.toLowerCase() === "true";
  const negate = isNegated(condition.operator);
  return (slots) => {
    const value = slots[slot];
    if (typeof value !== "boolean") return false;
    return (value === want) !== negate;
  };
};

const numericTest = (condition: FilterCondition, slot: number): Test => {
  const want = Number(condition.values[0]);
  const compare = comparer(condition.operator);
  return (slots) => {
    const value = slots[slot];
    return typeof value === "number" && compare(value, want);
  };
};

const orderedTest = (condition: FilterCondition, slot: number): Test => {
  const entry = CONDITIONS[condition.name];
  if (!("order" in entry)) return () => false;

  const negate = isNegated(condition.operator);
  const ladder = new Map(entry.order.map((step, index) => [step.toLowerCase(), index]));

  if (!negate && condition.operator !== "=" && condition.operator !== "==") {
    const want = ladder.get((condition.values[0] ?? "").toLowerCase());
    if (want === undefined) return () => false;
    const compare = comparer(condition.operator);
    return (slots) => {
      const value = slots[slot];
      if (typeof value !== "string") return false;
      const have = ladder.get(value);
      return have !== undefined && compare(have, want);
    };
  }

  const wanted = new Set(condition.values.map((one) => one.toLowerCase()));
  return (slots) => {
    const value = slots[slot];
    if (typeof value !== "string") return false;
    return wanted.has(value) !== negate;
  };
};

const stringsTest = (condition: FilterCondition, slot: number): Test => {
  const negate = isNegated(condition.operator);
  const wanted = condition.values.map((one) => one.toLowerCase());

  if (condition.operator === "==") {
    const set = new Set(wanted);
    return (slots) => {
      const value = slots[slot];
      return typeof value === "string" && set.has(value);
    };
  }

  return (slots) => {
    const value = slots[slot];
    if (typeof value !== "string") return false;
    return wanted.some((want) => value.includes(want)) !== negate;
  };
};

const enumsTest = (condition: FilterCondition, slot: number): Test => {
  const negate = isNegated(condition.operator);
  const wanted = condition.values.map((one) => one.toLowerCase());
  return (slots) => {
    const have = slots[slot];
    if (!Array.isArray(have)) return false;
    const any = wanted.some((want) => (want === "none" ? have.length === 0 : have.includes(want)));
    return any !== negate;
  };
};

const gemTest = (condition: FilterCondition, slot: number): Test => {
  const negate = isNegated(condition.operator);
  const lower = (condition.values[0] ?? "").toLowerCase();

  if (lower === "true" || lower === "false") {
    const want = lower === "true";
    return (slots) => {
      const value = slots[slot];
      if (typeof value !== "string") return false;
      return (value !== "" === want) !== negate;
    };
  }

  const exact = condition.operator === "==";
  return (slots) => {
    const value = slots[slot];
    if (typeof value !== "string") return false;
    return (exact ? value === lower : value.includes(lower)) !== negate;
  };
};

const testOf = (condition: FilterCondition, slot: number): Test => {
  switch (condition.kind) {
    case "boolean":
      return booleanTest(condition, slot);
    case "numeric":
      return numericTest(condition, slot);
    case "ordered":
      return orderedTest(condition, slot);
    case "strings":
      return stringsTest(condition, slot);
    case "enums":
      return enumsTest(condition, slot);
    case "gem":
      return gemTest(condition, slot);
    default:
      return (_slots, item) => matchCondition(condition, item);
  }
};

/** The lowercased `BaseType ==` values a block can only match, or undefined. */
const baseTypeKeys = (block: FilterBlock): readonly string[] | undefined => {
  const line = block.conditions.find((condition) => condition.name === "BaseType" && condition.operator === "==");
  return line?.values.map((value) => value.toLowerCase());
};

const merge = (a: readonly number[], b: readonly number[]): number[] => {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) out.push(a[i]! < b[j]! ? a[i++]! : b[j++]!);
  while (i < a.length) out.push(a[i++]!);
  while (j < b.length) out.push(b[j++]!);
  return out;
};

function compileWalk(blocks: readonly FilterBlock[]): (item: FilterItem, every: boolean) => FilterMatch {
  const slotOf = new Map<ConditionName, number>();
  const slotConditions: FilterCondition[] = [];

  const compiled: Compiled[] = blocks.map((block) => ({
    block,
    tests: block.conditions.map((condition) => {
      if (!SLOTTED_KINDS.has(condition.kind)) return testOf(condition, -1);
      let slot = slotOf.get(condition.name);
      if (slot === undefined) {
        slot = slotConditions.length;
        slotOf.set(condition.name, slot);
        slotConditions.push(condition);
      }
      return testOf(condition, slot);
    }),
  }));

  const byBaseType = new Map<string, number[]>();
  const generic: number[] = [];
  compiled.forEach(({ block }, index) => {
    const keys = baseTypeKeys(block);
    if (keys === undefined) {
      generic.push(index);
      return;
    }
    for (const key of new Set(keys)) {
      const list = byBaseType.get(key);
      if (list === undefined) byBaseType.set(key, [index]);
      else list.push(index);
    }
  });

  const candidates = new Map<string, readonly number[]>();
  const candidatesOf = (baseType: string | undefined): readonly number[] => {
    if (baseType === undefined) return generic;
    const cached = candidates.get(baseType);
    if (cached !== undefined) return cached;
    const list = merge(byBaseType.get(baseType) ?? [], generic);
    candidates.set(baseType, list);
    return list;
  };

  const baseTypeSlot = slotOf.get("BaseType");

  return (item, every) => {
    const slots: Slots = new Array(slotConditions.length);
    for (let i = 0; i < slotConditions.length; i++) {
      const condition = slotConditions[i]!;
      slots[i] = prepare(condition, item[condition.name]);
    }

    const baseType = baseTypeSlot === undefined ? undefined : slots[baseTypeSlot];
    const order = candidatesOf(typeof baseType === "string" ? baseType : undefined);

    const matched: FilterBlock[] = [];
    let winner: FilterBlock | undefined;
    for (const index of order) {
      const { block, tests } = compiled[index]!;
      let pass = true;
      for (const test of tests) {
        if (!test(slots, item)) {
          pass = false;
          break;
        }
      }
      if (!pass) continue;
      matched.push(block);
      if (block.continues || winner !== undefined) continue;
      winner = block;
      if (!every) return { winner, matched };
    }
    return winner === undefined ? { matched } : { winner, matched };
  };
}

/**
 * Compile a parsed filter once into a matcher for many items. It answers what
 * `evaluateFilter` answers, and precomputes everything that does not depend on the item.
 *
 * Blocks with a `BaseType ==` line are indexed by those names, so an item only walks the
 * blocks its base type can match plus the blocks that name no base type.
 */
export function compileFilter(blocks: readonly FilterBlock[]): FilterMatcher {
  const walk = compileWalk(blocks);
  return (item) => walk(item, false);
}

/** Like `compileFilter`, but `matched` holds every block that matches, past the winner too. */
export function compileFilterEvery(blocks: readonly FilterBlock[]): FilterMatcher {
  const walk = compileWalk(blocks);
  return (item) => walk(item, true);
}
