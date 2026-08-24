export type GGGStatOptionData = {
  readonly id: string | number;
  readonly text: string;
};

export type GGGStatData = {
  readonly id: string;
  readonly text: string;
  readonly type: string;
  readonly option?: { readonly options: readonly GGGStatOptionData[] };
};

export type GGGStatGroupData = {
  readonly id: string;
  readonly label: string;
  readonly entries: readonly GGGStatData[];
};

export type GGGStatDataResponse = {
  readonly result: readonly GGGStatGroupData[];
};

export type GGGStatOption = {
  readonly id: string | number;
  readonly text: string;
};

/**
 * `type` is one of `explicit`, `implicit`, `pseudo`, `fractured`, `enchant`, `crafted`,
 * `veiled`, `imbued`, `scourge`, `crucible`, `delve`, `ultimatum`, `sanctum`,
 * `mercenary`.
 *
 * `options` means the `#` is picked from a list rather than typed as a number, and a
 * query carries the option's id — "Searing Exarch Implicit Modifier (#)" is searched as
 * Lesser, Greater or Grand.
 */
export type GGGStat = {
  readonly id: string;
  readonly text: string;
  readonly type: string;
  readonly options?: readonly GGGStatOption[];
};
