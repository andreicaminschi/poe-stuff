/**
 * GGG states both rate-limit headers as comma-separated triples of `a:b:c`. This is the
 * trust boundary for them: a faithful read of the wire format, no calls into the limiter.
 */

import type { RateLimiterRule, RateLimitState } from "./types.ts";

/**
 * Stop this far short of every limit. The state header describes the *previous*
 * response, so the last slot in a window is the one most likely to be wrong.
 */
const HEADROOM = 1;

/** `x-rate-limit-ip` — `requests:windowSeconds:banSeconds`. The ban length is not a rule. */
export function parseRules(header: string | null): RateLimiterRule[] {
  return parseTriples(header).map(([requests, windowSeconds]) => ({
    max: Math.max(1, requests - HEADROOM),
    windowMs: windowSeconds * 1000,
  }));
}

/** `x-rate-limit-ip-state` — `hits:windowSeconds:restrictedSeconds`. */
export function parseState(header: string | null): RateLimitState[] {
  return parseTriples(header).map(
    ([hits, windowSeconds, restrictedSeconds]) => ({
      hits,
      windowSeconds,
      restrictedSeconds,
    }),
  );
}

function parseTriples(header: string | null): [number, number, number][] {
  if (header === null || header === "") return [];

  return header.split(",").flatMap((part) => {
    const [a, b, c] = part.split(":").map(Number);
    // Number("") is 0 rather than NaN, so a short triple has to be caught by arity
    // before the finite check gets a say.
    if (a === undefined || b === undefined || c === undefined) return [];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
      return [];
    }
    return [[a, b, c] as [number, number, number]];
  });
}
