import type { Palette, TierName } from "@poe/filter-style/types";

export type Floors = Readonly<Record<TierName, number>>;

/** One top-level category's look and ladder. `floors` replaces the global ones. */
export type CategoryConfig = {
  readonly palette: Palette;
  readonly disabled: readonly TierName[];
  readonly wanted: readonly string[];
  readonly floors?: Floors;
};

/** What `.s3/generator/config.json` holds. Hints are not here: they come from the taxonomy. */
export type GeneratorConfig = {
  readonly floors: Floors;
  readonly categories: Readonly<Record<string, CategoryConfig>>;
};
