import type { ExchangeCore, ExchangeItemMeta, ExchangeLine } from "./types.ts";

export type ExchangeOverviewResponse = {
  readonly core: ExchangeCore;
  readonly lines: readonly ExchangeLine[];
  readonly items: readonly ExchangeItemMeta[];
};
