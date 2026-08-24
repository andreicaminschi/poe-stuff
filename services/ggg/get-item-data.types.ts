export type GGGItemData = {
  readonly name?: string;
  readonly type: string;
  readonly text?: string;
  readonly disc?: string;
  readonly flags?: { readonly unique?: boolean };
};

export type GGGItemGroupData = {
  readonly id: string;
  readonly label: string;
  readonly entries: readonly GGGItemData[];
};

export type GGGItemDataResponse = {
  readonly result: readonly GGGItemGroupData[];
};

export type UniqueGGGItem = {
  readonly kind: "unique";
  readonly name: string;
  readonly baseType: string;
  readonly displayText: string;
  readonly variantTag?: string;
};

export type BaseGGGItem = {
  readonly kind: "base";
  readonly baseType: string;
  readonly displayText?: string;
  readonly variantTag?: string;
};

/** The payload carries no tag; `kind` is synthesised from `flags.unique`. */
export type GGGItem = UniqueGGGItem | BaseGGGItem;

export type GGGItemGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly GGGItem[];
};
