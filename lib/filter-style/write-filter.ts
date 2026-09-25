import { conditionLine } from "@poe/filter-compile/condition-line";
import { resolveForms } from "@poe/filter-compile/resolve-row";
import type { Condition } from "@poe/filter-compile/types";
import { formatNote } from "@poe/filter-eval/format-note";
import { tierStyle } from "./tier-style.ts";
import { HIDDEN, TIERS, UNPRICED, VERBS, WANT } from "./types.ts";
import type { BucketName, CatalogRow, CategoryRecord, Item, Palette, Placed, Placement, Verb } from "./types.ts";
import { actionLines } from "./write-filter/actions.ts";

/** One category's placements, and the palette it is drawn in. */
export type CategoryPlan = { readonly palette: Palette; readonly placed: Placed };

export type WriteInput = {
  readonly rows: readonly CatalogRow[];
  readonly categories: Readonly<Record<string, CategoryRecord>>;
  readonly plans: readonly CategoryPlan[];
};

export type WrittenBlock = {
  readonly item: Item;
  readonly bucket: BucketName;
  readonly verb: Verb;
  readonly conditions: readonly Condition[];
  readonly freehand: string;
};

export type Skip = { readonly item: string; readonly problem: string };

export type Written = {
  readonly text: string;
  readonly blocks: readonly WrittenBlock[];
  readonly skipped: readonly Skip[];
};

const ORDER: readonly BucketName[] = [WANT, UNPRICED, ...TIERS, HIDDEN];

const NOTE_TIER: Readonly<Record<BucketName, string>> = {
  ...Object.fromEntries(TIERS.map((name) => [name, name])),
  [WANT]: "want",
  [UNPRICED]: "unpriced",
  [HIDDEN]: "hidden",
} as Record<BucketName, string>;

type Drawn = { readonly placement: Placement; readonly palette: Palette };

type Built = { readonly block: WrittenBlock; readonly text: string } | { readonly problem: string };

function stackConditions(placement: Placement): readonly Condition[] {
  const { stack } = placement;
  if (stack === undefined) return [];

  return [
    ...(stack.floor === 0 ? [] : [{ condition: "StackSize", operator: ">=", value: stack.floor }]),
    ...(stack.ceiling === undefined ? [] : [{ condition: "StackSize", operator: "<", value: stack.ceiling }]),
  ];
}

function conditionsOf(
  rows: ReadonlyMap<string, CatalogRow>,
  categories: WriteInput["categories"],
  item: Item,
): readonly Condition[] | { readonly problem: string } {
  const row = rows.get(item.key);
  if (row === undefined) return { problem: "no catalog row has its key" };

  const variant = row.variants?.find((one) => one.name === item.variant);
  const [form] = resolveForms(
    categories,
    { ...row, conditions: row.conditions ?? [] },
    variant === undefined ? undefined : [{ name: variant.name, conditions: variant.conditions ?? [] }],
  );
  if (form === undefined) return { problem: "resolves to no form" };

  const [problem] = form.problems;
  if (problem !== undefined) return { problem };
  if (form.conditions.length === 0) return { problem: "has no conditions yet" };

  return form.conditions.map(({ level, overrides, ...condition }) => condition);
}

function build(drawn: Drawn, rows: ReadonlyMap<string, CatalogRow>, categories: WriteInput["categories"]): Built {
  const { placement, palette } = drawn;
  const resolved = conditionsOf(rows, categories, placement.item);
  if ("problem" in resolved) return resolved;

  const conditions = [...resolved, ...stackConditions(placement)];
  const lines: string[] = [];
  for (const result of conditions.map(conditionLine)) {
    if ("problem" in result) return { problem: result.problem };
    lines.push(result.line);
  }
  if (lines.some((line) => line.includes("#"))) return { problem: "has a # in a value, which would start a comment" };

  const { item, bucket, verb } = placement;
  const freehand = item.variant === undefined ? item.key : `${item.key} ${item.variant}`;
  const note = formatNote({ tier: NOTE_TIER[bucket], verb }, freehand);
  const actions = actionLines(tierStyle(palette, bucket, verb));
  const text = [bucket === HIDDEN ? "Hide" : "Show", ...[...lines, ...actions].map((line) => `  ${line}`), `  ${note}`].join("\n");

  return { block: { item, bucket, verb, conditions, freehand }, text };
}

const rank = (drawn: Drawn): number =>
  ORDER.indexOf(drawn.placement.bucket) * VERBS.length + VERBS.indexOf(drawn.placement.verb);

/**
 * Every winning placement as a styled `.filter` block.
 *
 * Want to see comes first, then Unpriced, then T0 to T5, then Hidden as `Hide` blocks, and inside one
 * bucket take before check before gamble, because the first block that matches wins. The
 * conditions come from `@poe/filter-compile`, plus a stack-size placement's `StackSize` range.
 * A placement whose conditions cannot be written is skipped with its reason.
 */
export function writeFilter(input: WriteInput): Written {
  const rows = new Map(input.rows.map((row) => [row.key, row]));
  const drawn = input.plans
    .flatMap(({ palette, placed }) => placed.placed.filter((one) => one.won).map((placement) => ({ placement, palette })))
    .sort((a, b) => rank(a) - rank(b));

  const texts: string[] = [];
  const blocks: WrittenBlock[] = [];
  const skipped: Skip[] = [];

  for (const one of drawn) {
    const built = build(one, rows, input.categories);
    if ("problem" in built) {
      skipped.push({ item: one.placement.item.name, problem: built.problem });
      continue;
    }
    texts.push(built.text);
    blocks.push(built.block);
  }

  return { text: texts.length === 0 ? "" : `${texts.join("\n\n")}\n`, blocks, skipped };
}
