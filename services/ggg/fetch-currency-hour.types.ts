import type { CurrencyMarket } from "./types.ts";

/** Envelope returned by `GET /api/currency-exchange/:hour`. */
export type CurrencyExchange = {
  /**
   * Start of the next hour, in unix seconds. Equal to the requested id at the end of the
   * stream — the hour now running is not published until it ends, and asking for it
   * answers `404` with an empty `markets`, which `call` raises rather than returns.
   */
  readonly next_change_id: number;
  readonly markets: readonly CurrencyMarket[];
};
