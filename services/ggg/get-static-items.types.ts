export type GGGStaticItemData = {
  readonly id: string;
  readonly text: string;
  readonly image?: string;
};

export type GGGStaticGroupData = {
  readonly id: string;
  readonly label: string;
  readonly entries: readonly GGGStaticItemData[];
};

export type GGGStaticItemDataResponse = {
  readonly result: readonly GGGStaticGroupData[];
};

/**
 * `category` and `label` are the group the row arrived in. That grouping is the whole
 * reason to read this endpoint — it is GGG saying which kind of currency an item is, and
 * nothing else in the API does.
 */
export type GGGStaticItem = {
  readonly id: string;
  readonly text: string;
  readonly image?: string;
  readonly category: string;
  readonly label: string;
};
