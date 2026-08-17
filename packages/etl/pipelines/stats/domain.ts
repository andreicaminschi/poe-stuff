/**
 * Contract for the friendly form of the stats data. Owned by us, not GGG —
 * everything downstream of `transform.ts` should speak only this.
 */
import type { Collision } from "../../core/collisions.ts";

export type StatOption = {
  readonly value: number;
  readonly label: string;
};

export type Stat = {
  readonly id: string;
  /** Group id, e.g. `explicit`. Repeated here so the flat output stands alone. */
  readonly group: string;
  /** Original display text, placeholders and newlines intact. */
  readonly text: string;
  /** `text` split on newlines. */
  readonly lines: readonly string[];
  /** How many `#` placeholders `text` contains; 0 means a flat, valueless stat. */
  readonly placeholders: number;
  /** Enumerated values for option stats; empty for everything else. */
  readonly options: readonly StatOption[];
};

export type StatGroup = {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly stats: readonly Stat[];
};

export type StatTotals = {
  readonly groups: number;
  readonly stats: number;
  readonly withPlaceholders: number;
  readonly withOptions: number;
  readonly collidingIds: number;
};

export type Stats = {
  readonly totals: StatTotals;
  /** 229 stat ids repeat within their own group with different text. */
  readonly collisions: readonly Collision[];
  readonly groups: readonly StatGroup[];
};
