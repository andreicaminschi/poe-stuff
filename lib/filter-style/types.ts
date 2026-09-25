import type { Condition } from "@poe/filter-compile/types";

export type Hint = "check" | "gamble";
export type Tiering = "chaos" | "stack-size";
export type Verb = "take" | "check" | "gamble";

export const VERBS: readonly Verb[] = ["take", "check", "gamble"];

export const TIERS = ["T0", "T1", "T2", "T3", "T4", "T5"] as const;
export type TierName = (typeof TIERS)[number];

export const WANT = "Want to see";
export const HIDDEN = "Hidden";
export const UNPRICED = "Unpriced";
export type BucketName = TierName | typeof WANT | typeof UNPRICED | typeof HIDDEN;

/** One unique form on a base row, as the catalog lists it. */
export type UniqueListing = {
  readonly name: string;
  readonly meanPrice?: number;
  readonly corrupted: boolean;
  readonly lowConfidence?: boolean;
};

export type UniqueGroup = {
  readonly category: string;
  readonly subcategory: string | null;
  readonly listings: readonly UniqueListing[];
};

export type CatalogVariant = {
  readonly name: string;
  readonly conditions?: readonly Condition[];
  readonly meanPrice?: number;
  readonly lowConfidence?: boolean;
};

/** One row of `catalog.json`, as far as the generator reads it. */
export type CatalogRow = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly baseTypes: readonly string[];
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly CatalogVariant[];
  readonly meanPrice?: number;
  readonly lowConfidence?: boolean;
  readonly unpriceable?: boolean;
  readonly uniques?: readonly UniqueGroup[];
};

/** One record of `catalog.categories.json`. */
export type CategoryRecord = {
  readonly conditions: readonly Condition[];
  readonly name?: string;
  readonly tiering?: Tiering;
  readonly hints?: readonly Hint[];
};

/** Chaos. A missing verb is a price nothing gave. */
export type Prices = { readonly take?: number; readonly check?: number; readonly gamble?: number };

/** What the filter can tell apart on the ground: a row, or one variant of it. */
export type Item = {
  readonly name: string;
  readonly key: string;
  readonly variant?: string;
  readonly category: string;
  readonly prices: Prices;
  readonly unpriceable?: boolean;
};

/** A floor, and the exclusive ceiling the next enabled tier above sets. */
export type Bucket = { readonly name: BucketName; readonly floor: number; readonly ceiling?: number };

export type Placement = {
  readonly item: Item;
  readonly bucket: BucketName;
  readonly verb: Verb;
  readonly reason: string;
  /** The one qualification that gets the block. */
  readonly won: boolean;
  /** A stack-size category's `StackSize` range for this block. */
  readonly stack?: { readonly floor: number; readonly ceiling?: number };
};

export type Unplaced = { readonly item: Item; readonly reason: string };

export type Placed = {
  readonly ladder: readonly Bucket[];
  readonly placed: readonly Placement[];
  readonly unplaced: readonly Unplaced[];
};

/** One category's settings. Floors count Chaos, or stack size in a stack-size category. */
export type PlaceOptions = {
  readonly floors: Readonly<Record<TierName, number>>;
  readonly disabled: readonly TierName[];
  readonly hints: readonly Hint[];
  readonly wanted: readonly string[];
  readonly tiering?: Tiering;
};

export const ICON_COLOURS = {
  Red: "#e02020",
  Green: "#1fbf1f",
  Blue: "#4560ff",
  Brown: "#a05a2c",
  White: "#ffffff",
  Yellow: "#ffe000",
  Cyan: "#40e0e0",
  Grey: "#a0a0a0",
  Orange: "#ff9020",
  Pink: "#ff80c0",
  Purple: "#a040f0",
} as const;
export type IconColour = keyof typeof ICON_COLOURS;

export const ICON_SHAPES = [
  "Circle",
  "Diamond",
  "Hexagon",
  "Square",
  "Star",
  "Triangle",
  "Cross",
  "Moon",
  "Raindrop",
  "Kite",
  "Pentagon",
  "UpsideDownHouse",
] as const;
export type IconShape = (typeof ICON_SHAPES)[number];

export const FONT_SIZES = { XL: 45, L: 38, M: 32, S: 25, XS: 18 } as const;
export type SizeName = keyof typeof FONT_SIZES;

export type Palette = { readonly primary: string; readonly secondary: string; readonly icon: IconShape };

export type Style = {
  readonly size: SizeName;
  readonly fontSize: number;
  readonly background: string;
  readonly text: string;
  readonly border: string;
  readonly opacity: number;
  readonly icon: { readonly size: 0 | 1 | 2; readonly colour: IconColour; readonly shape: IconShape } | null;
  readonly beam: { readonly colour: IconColour } | null;
};
