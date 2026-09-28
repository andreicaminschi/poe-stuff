export type PoeWatchLink = {
  readonly source: "poeWatch:items" | "poeWatch:exchange";
  readonly id: number | null;
  readonly name: string;
};

export type UniqueGroup = {
  readonly subcategory: string | null;
  readonly listings: readonly { readonly corrupted: boolean; readonly poeWatch: PoeWatchLink }[];
};

/** What the matchers read off a catalog row. */
export type LinkRow = {
  readonly key: string;
  readonly name: string;
  readonly poeWatch?: PoeWatchLink;
  readonly variants?: readonly { readonly name: string; readonly poeWatch?: PoeWatchLink }[];
  readonly uniques?: readonly UniqueGroup[];
};
