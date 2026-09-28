export type MarketEntry = {
  readonly source: "poeWatch:items" | "poeWatch:exchange";
  readonly id: number | null;
  readonly name: string;
};

export type UniqueGroup = {
  readonly subcategory: string | null;
  readonly listings: readonly { readonly corrupted: boolean; readonly poeWatch: MarketEntry }[];
};

/** What the entry finders read off a catalog row. */
export type EntryRow = {
  readonly key: string;
  readonly name: string;
  readonly poeWatch?: MarketEntry;
  readonly variants?: readonly { readonly name: string; readonly poeWatch?: MarketEntry }[];
  readonly uniques?: readonly UniqueGroup[];
};
