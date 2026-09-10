import type { GGGItem } from "./types.ts";

export type GGGItemGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly GGGItem[];
};
