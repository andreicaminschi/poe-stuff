import type { ApplyKey } from "@poe/filter-eval/filter-ast";
import type { Condition } from "@poe/taxonomy/get-taxonomy.types";

/** One price band: its name in the `#@` vocabulary, the Chaos it starts at, its look. */
export type Tier = {
  readonly name: string;
  readonly min: number;
  /** Action lines, written into the block as they are. */
  readonly actions: readonly string[];
};

export type Config = {
  /** The gold folder holding `catalog.json` and `catalog.categories.json`. */
  readonly catalog: string;
  readonly output: string;
  readonly tiers: readonly Tier[];
  readonly uniques: {
    /** A corruption outcome at or over this many Chaos gets named in the block's note. */
    readonly corruptionMin: number;
  };
};

export type Notes = Readonly<Partial<Record<ApplyKey, string>>>;

/** One block: the conditions to write, the tier that styles it, and the note it ends with. */
export type Decision = {
  readonly conditions: readonly Condition[];
  readonly tier: string;
  readonly notes: Notes;
  readonly freehand: string;
};

/** A rule that got no block, and why. */
export type Skipped = {
  readonly key: string;
  readonly reason: string;
};
