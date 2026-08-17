import { league as leagueEnv, tradeApiUrl, userAgent } from "./env.ts";
import type { RateLimiter } from "./throttle.ts";

/** Fetch takes at most ten hashes per call. One page. */
export const FETCH_CHUNK = 10;

export type SearchResponse = {
  readonly id: string;
  readonly complexity: number;
  readonly total: number;
  /** Up to 100 result hashes. GGG caps the list regardless of `total`. */
  readonly result: readonly string[];
};

export type ApiResult<T> =
  | { readonly ok: true; readonly body: T }
  | { readonly ok: false; readonly status: number; readonly retryable: boolean };

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** The limiter is passed in: it belongs to the worker process, not this module. */
async function call<T>(
  url: string,
  limiter: RateLimiter,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  await limiter.acquire();

  const response = await fetch(url, {
    ...init,
    headers: {
      "user-agent": userAgent(),
      accept: "application/json",
      ...(init?.body === undefined ? {} : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });

  limiter.observe(response);

  if (!response.ok) {
    return { ok: false, status: response.status, retryable: RETRYABLE.has(response.status) };
  }
  return { ok: true, body: (await response.json()) as T };
}

export function postSearch(
  limiter: RateLimiter,
  query: unknown,
  league = leagueEnv(),
): Promise<ApiResult<SearchResponse>> {
  const url = `${tradeApiUrl()}/search/${encodeURIComponent(league)}`;
  return call<SearchResponse>(url, limiter, { method: "POST", body: JSON.stringify(query) });
}

/**
 * Result rows are passed through untouched — this is a raw drop, so the only
 * thing asserted is the envelope.
 */
export function getFetch(
  limiter: RateLimiter,
  hashes: readonly string[],
  searchId: string,
): Promise<ApiResult<{ result: readonly unknown[] }>> {
  const url = `${tradeApiUrl()}/fetch/${hashes.join(",")}?query=${encodeURIComponent(searchId)}`;
  return call<{ result: readonly unknown[] }>(url, limiter);
}
