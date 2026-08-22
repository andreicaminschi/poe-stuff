/**
 * One item copied out of the game, and every filter block that has something to say about
 * it.
 *
 * Nothing here decides anything of its own. The item is read by `@poe/item`, the file is
 * read by `@poe/filter-eval`, and the walk down the blocks is the same `evaluateFilter` the
 * game's own order is modelled on — so what comes back is what the filter does, not a
 * second opinion about what it ought to do.
 *
 * A block's lines are handed back verbatim, because the parser keeps conditions and drops
 * actions: the colour, the sound and the map icon are the half of a block a player is
 * usually asking about, and they only exist in the source text.
 */

import { evaluateFilter } from "@poe/filter-eval/evaluate-filter";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { parseItem } from "@poe/item/parse-item";
import { toFilterItem } from "@poe/item/to-filter-item";
import type {
  ApplyKey,
  FilterBlock,
  FilterItem,
  Keyword,
} from "@poe/filter-eval/filter-ast";

/** One block that has something to say about the item. */
export type Rule = {
  /** 1-based line of the block header, so the file can be opened at it. */
  readonly line: number;
  readonly keyword: Keyword;
  /** Whether the block carries a `Continue`, which is why a later one also got a say. */
  readonly continues: boolean;
  /** The comment trailing the block header, without its `#`, or `""`. */
  readonly comment: string;
  /** The block's `#@` pairs — `tier`, `verb`, `family`. */
  readonly notes: Readonly<Partial<Record<ApplyKey, string>>>;
  /** Whatever followed the pairs on the `#@` line, which names the bucket behind it. */
  readonly freehand: string;
  /**
   * True when the block's own conditions match but the game never reaches it, because an
   * earlier block without a `Continue` already took the item. Only ever true under
   * `all: true`.
   */
  readonly shadowed: boolean;
  /** The block as written, header through `#@` note. */
  readonly text: readonly string[];
};

export type Explanation = {
  /** The item as a filter sees it — the keys every condition below was asked against. */
  readonly item: FilterItem;
  /** `Show`, `Hide`, `Minimal`, or `none` when no block took the item at all. */
  readonly verdict: Keyword | "none";
  /** The notes that survived the walk, later blocks beating earlier ones. */
  readonly notes: Readonly<Partial<Record<ApplyKey, string>>>;
  /** Every rule with a say, in file order. */
  readonly rules: readonly Rule[];
};

export type ExplainOptions = {
  /** Also report blocks that match but never run. Default `false`. */
  readonly all?: boolean;
};

/**
 * The block's own lines. The grammar puts the `#@` note last, so that line is the end and
 * anything after it — a blank, a section banner — belongs to whatever comes next.
 */
const textOf = (
  block: FilterBlock,
  lines: readonly string[],
  nextHeader: number,
): readonly string[] => {
  const note = block.notes.at(-1)?.line;
  const end = note ?? nextHeader - 1;
  return lines.slice(block.line - 1, end);
};

const notesOf = (block: FilterBlock): Partial<Record<ApplyKey, string>> =>
  Object.fromEntries(block.notes.map((note) => [note.key, note.value]));

export function explainItem(
  itemText: string,
  filterText: string,
  options: ExplainOptions = {},
): Explanation {
  const blocks = parseFilter(filterText);
  const lines = filterText.split(/\r?\n/);
  const item = toFilterItem(parseItem(itemText));

  const result = evaluateFilter(blocks, item);
  const applied = new Set(result.matched.map((match) => match.line));

  const rules: Rule[] = [];

  for (const [at, block] of blocks.entries()) {
    const ran = applied.has(block.line);
    // A shadowed block is asked on its own, so the answer is about its conditions only and
    // the blocks above it cannot get in the way.
    const matches =
      ran ||
      (options.all === true && evaluateFilter([block], item).verdict !== "none");

    if (!matches) continue;

    rules.push({
      line: block.line,
      keyword: block.keyword,
      continues: block.continues,
      comment: block.comment,
      notes: notesOf(block),
      freehand: block.freehand,
      shadowed: !ran,
      text: textOf(block, lines, blocks[at + 1]?.line ?? lines.length + 1),
    });
  }

  return { item, verdict: result.verdict, notes: result.notes, rules };
}
