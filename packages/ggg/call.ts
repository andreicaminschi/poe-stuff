import { cacheKey } from "@util/core/cache-key";
import { requireEnv } from "@util/core/env";
import { sleep } from "@util/core/sleep";
import { GggHttpError } from "./errors.ts";
import {
  parseRetryAfter,
  parseRules,
  parseState,
} from "./parse-rate-limit-headers.ts";
import type { CallEvent, RateLimiter, ResponseCache } from "./types.ts";

/**
 * 429 is retryable because the limiter is given a hold before the error leaves this
 * module — without that, retrying a 429 is what escalates a ban. With no limiter there
 * is no hold and the backoff is all that separates the attempts — fine against an
 * endpoint that publishes no limits, since there is no budget to overrun.
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

const noop = () => {};

export type CallOptions = {
  /**
   * Omit only for an endpoint that publishes no limits of its own — the static poecdn
   * digests. Everything on pathofexile.com draws on one per-IP budget and must be paced.
   */
  limiter?: RateLimiter | null;
  /** Extra attempts after the first. Leave at 0 where a job queue owns retries. */
  retries?: number;
  init?: RequestInit;
  /**
   * Called as the request progresses. Runs inline and is never awaited, so it must
   * not throw: an exception here would fail a request that otherwise succeeded.
   * Absent by default, which is what production wants.
   */
  onEvent?: (event: CallEvent) => void;
  /**
   * Answers the request from a previous one where it can. Present on a laptop, absent
   * in production — there is no switch beyond handing one over or not.
   */
  cache?: ResponseCache;
};

/**
 * Built here rather than taken from the caller, so two identical requests cannot be
 * keyed apart by two call sites.
 *
 * Only a string body can be keyed. A stream would have to be consumed to be hashed, and
 * consuming it here would leave nothing to send; keying every stream the same would
 * quietly serve one request's answer to another.
 */
function requestKey(url: string, method: string, body: RequestInit["body"]): string {
  if (body !== undefined && body !== null && typeof body !== "string") {
    throw new TypeError("call can only cache a request whose body is a string");
  }

  return cacheKey("ggg", method, url, body ?? "");
}

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
  const { limiter, retries = 0, init, onEvent = noop, cache } = options;
  const method = init?.method ?? "GET";
  const key = cache && requestKey(url, method, init?.body);

  // A hit ends the call here: no slot taken, no request made, and the limiter left
  // alone. The rate-limit headers that came with a stored answer describe a budget from
  // whenever it was stored, and a two minute old penalty is worse than no information.
  if (cache && key) {
    const cached = await cache.get(key);
    if (cached) {
      onEvent({ type: "cache", result: "hit", key });
      return cached.body as T;
    }
  }

  for (let attempt = 0; ; attempt++) {
    const askedAt = Date.now();
    await limiter?.acquire();

    // Only when it actually held. At full budget `acquire` returns immediately, and a
    // 0 ms line per request is pure noise at trade's fan-out.
    const waited = Date.now() - askedAt;
    if (waited > 0) onEvent({ type: "wait", ms: waited });

    onEvent({ type: "request", url, method, attempt });

    const sentAt = Date.now();
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

    onEvent({
      type: "response",
      url,
      status: response.status,
      durationMs: Date.now() - sentAt,
    });

    if (limiter) applyRateLimits(limiter, response, onEvent);

    if (response.ok) {
      const body = (await response.json()) as T;

      // Only a 2xx is worth keeping. A stored 429 would answer every later run with the
      // ban that had already expired.
      if (cache && key) {
        await cache.set(key, {
          url,
          status: response.status,
          body,
          storedAt: new Date().toISOString(),
        });
        onEvent({ type: "cache", result: "stored", key });
      }

      return body;
    }

    const error = new GggHttpError(
      url,
      response.status,
      RETRYABLE.has(response.status),
    );
    if (!error.retryable || attempt >= retries) throw error;

    const backoff = backoffMs(attempt);
    onEvent({
      type: "retry",
      url,
      status: response.status,
      backoffMs: backoff,
    });

    await sleep(backoff);
  }
}

/** Folds whatever the response says about our budget back into the limiter. */
function applyRateLimits(
  limiter: RateLimiter,
  response: Response,
  onEvent: (event: CallEvent) => void,
): void {
  // The server's own limits win over whatever we were paced at. A missing header parses
  // to an empty list, which is not an instruction to drop the rules we already have.
  const rules = parseRules(response.headers.get("x-rate-limit-ip"));
  if (rules.length > 0) limiter.setRules(rules);

  for (const state of parseState(
    response.headers.get("x-rate-limit-ip-state"),
  )) {
    if (state.restrictedSeconds > 0) {
      limiter.penalize(state.restrictedSeconds);
      onEvent({
        type: "penalize",
        seconds: state.restrictedSeconds,
        source: "state",
      });
    }
  }

  if (response.status === 429) {
    const retryAfter = parseRetryAfter(
      response.headers.get("retry-after"),
      Date.now(),
    );
    const seconds = retryAfter || FALLBACK_BAN_SECONDS;
    limiter.penalize(seconds);
    onEvent({
      type: "penalize",
      seconds,
      source: retryAfter ? "retry-after" : "fallback",
    });
  }
}
