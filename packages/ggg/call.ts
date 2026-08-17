import { requireEnv } from "@util/core/env";
import { sleep } from "@util/core/sleep";
import { GggHttpError } from "./errors.ts";
import {
  parseRetryAfter,
  parseRules,
  parseState,
} from "./parse-rate-limit-headers.ts";
import type { RateLimiter } from "./types.ts";

/**
 * 429 is retryable only because the limiter is always given a hold before the error
 * leaves this module — without that, retrying a 429 is what escalates a ban.
 */
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/**
 * How long to hold after a 429 that names no duration of its own — either an upstream
 * proxy answered and GGG's headers are absent, or the state header came back all zeros.
 * Deliberately short: if the ban is really still running, the next 429 says so and that
 * one wins, since `penalize` never shortens an existing hold.
 */
const FALLBACK_BAN_SECONDS = 60;

/** Backoff between attempts. A 429 also waits out its hold inside `acquire`. */
const backoffMs = (attempt: number) => 500 * 2 ** attempt;

export type CallOptions = {
  limiter: RateLimiter;
  /** Extra attempts after the first. Leave at 0 where a job queue owns retries. */
  retries?: number;
  init?: RequestInit;
};

/**
 * One request to a GGG endpoint: paced by the limiter, with the server's own rate-limit
 * headers fed back into it, and a `GggHttpError` on any non-2xx answer.
 *
 * The body is asserted, not validated — callers that care hand the result to a schema.
 */
export async function call<T = unknown>(
  url: string,
  options: CallOptions,
): Promise<T> {
  const { limiter, retries = 0, init } = options;

  for (let attempt = 0; ; attempt++) {
    await limiter.acquire();

    const response = await fetch(url, {
      ...init,
      headers: {
        "user-agent": requireEnv("POE_USER_AGENT"),
        accept: "application/json",
        ...(init?.body === undefined
          ? {}
          : { "content-type": "application/json" }),
        ...init?.headers,
      },
    });

    applyRateLimits(limiter, response);

    if (response.ok) return (await response.json()) as T;

    const error = new GggHttpError(
      url,
      response.status,
      RETRYABLE.has(response.status),
    );
    if (!error.retryable || attempt >= retries) throw error;

    await sleep(backoffMs(attempt));
  }
}

/** Folds whatever the response says about our budget back into the limiter. */
function applyRateLimits(limiter: RateLimiter, response: Response): void {
  // The server's own limits win over whatever we were paced at. A missing header parses
  // to an empty list, which is not an instruction to drop the rules we already have.
  const rules = parseRules(response.headers.get("x-rate-limit-ip"));
  if (rules.length > 0) limiter.setRules(rules);

  for (const state of parseState(
    response.headers.get("x-rate-limit-ip-state"),
  )) {
    if (state.restrictedSeconds > 0) limiter.penalize(state.restrictedSeconds);
  }

  if (response.status === 429) {
    const retryAfter = parseRetryAfter(
      response.headers.get("retry-after"),
      Date.now(),
    );
    limiter.penalize(retryAfter || FALLBACK_BAN_SECONDS);
  }
}
