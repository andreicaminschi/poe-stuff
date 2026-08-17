/**
 * Contract for the friendly form of the static data — the currency, fragment
 * and card entries the trade site renders as icons. Owned by us, not GGG.
 */
import type { Collision } from "../../core/collisions.ts";

export type StaticItem = {
  readonly id: string;
  /** Group id, e.g. `Currency`. Repeated here so the flat output stands alone. */
  readonly group: string;
  readonly text: string;
  readonly subtext: string | null;
  readonly description: string | null;
  /**
   * Site-relative path exactly as GGG returns it. Left relative on purpose: the
   * host belongs to `.env`, and transforms stay pure.
   */
  readonly image: string | null;
  /** True for synthetic aggregate entries that aren't real items. */
  readonly pseudo: boolean;
  /**
   * True for GGG's `sep` rows, which are dropdown separators rather than items.
   * They all share the id `sep`, and their `text` is either blank or a section
   * heading like "Blighted Maps".
   */
  readonly separator: boolean;
};

export type StaticGroup = {
  readonly id: string;
  /** Null on the empty `Misc` group. */
  readonly label: string | null;
  readonly count: number;
  readonly items: readonly StaticItem[];
};

export type StaticTotals = {
  readonly groups: number;
  readonly items: number;
  readonly withImage: number;
  readonly pseudo: number;
  readonly separators: number;
  readonly collidingIds: number;
};

export type StaticData = {
  readonly totals: StaticTotals;
  /**
   * Real ids that appear on more than one entry. Separators are excluded — they
   * are a known non-item, not a data problem. Empty as of Allflame.
   */
  readonly collisions: readonly Collision[];
  readonly groups: readonly StaticGroup[];
};
