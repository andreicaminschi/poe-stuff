import type { CallEvent, RateLimiter, ResponseCache } from "@poe/ggg/types";

/**
 * What every trade call needs from the process it runs in. The limiter belongs to the
 * worker, the cache is present only where responses are being replayed, and `onEvent` is
 * bound to whatever the caller wants labelled.
 *
 * Passed as one object so that a new concern is a new field rather than a fifth
 * positional argument at two call sites.
 */
export type TradeContext = {
  limiter: RateLimiter;
  /** Absent in production. Its presence is the only thing that turns caching on. */
  cache?: ResponseCache;
  onEvent?: (event: CallEvent) => void;
};

/** Envelope returned by `POST /search/:league`. */
export type SearchResponse = {
  readonly id: string;
  readonly complexity: number;
  readonly total: number;
  /** Up to 100 result hashes. GGG caps the list regardless of `total`. */
  readonly result: readonly string[];
};

/**
 * Envelope returned by `GET /fetch/:hashes`. Rows are passed through untouched — this is
 * a raw drop, so only the envelope is asserted.
 */
export type FetchResponse = { readonly result: readonly unknown[] };

/**
 * One market: one currency pair, in one league, over one hour. Only `league` is read —
 * a market is written through exactly as it arrived, so nothing else is asserted here.
 */
export type CurrencyMarket = { readonly league: string };

/** Envelope returned by `GET /api/currency-exchange/:hour`. */
export type CurrencyExchange = {
  /** Unix hour of the next digest. Equal to the requested id at the end of the stream. */
  readonly next_change_id: number;
  readonly markets: readonly CurrencyMarket[];
};
