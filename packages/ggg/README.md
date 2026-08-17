# @poe/ggg

HTTP client for GGG's API: every request paced by a rate limiter that the server's own
rate-limit headers keep updated.

## Purpose

GGG rate-limits per IP and answers an overrun with a timed restriction, so the cost of
guessing wrong is a ban rather than a slow request. This package centralises the parts
that keep that from happening: queueing requests behind a limiter, reading the limit and
state headers off every response, holding everything for the length of any restriction the
server reports, and turning a non-2xx answer into a `GggHttpError`.

It knows nothing about endpoints — no URLs, no query building, no pagination. Response
bodies are asserted to the caller's type, never validated; a caller that cares hands the
result to a schema. Limiter state lives in memory on one instance, so it is a per-process,
per-IP arrangement with nothing persisted between runs.

## Structure

```
packages/ggg/
├── call.ts                          # the request: pace, send, fold headers back, retry or throw
├── rate-limiter.ts                  # createLimiter — FIFO queue, rolling windows, penalty deadline
├── parse-rate-limit-headers.ts      # wire format of the rate-limit headers; no limiter calls
├── types.ts                         # RateLimiter, RateLimiterRule, RateLimitState, CallEvent
├── errors.ts                        # GggHttpError
├── call.test.ts
├── parse-rate-limit-headers.test.ts
├── rate-limiter.test.ts
└── docs/                            # Mermaid diagrams
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/ggg/call` | `call`, `CallOptions` | One request through the limiter; resolves the JSON body as `T`, throws `GggHttpError` on non-2xx. |
| `@poe/ggg/rate-limiter` | `createLimiter` | Builds a `RateLimiter` from a rule list; `RangeError` if the list is empty or a rule is unusable. |
| `@poe/ggg/parse-rate-limit-headers` | `parseRules`, `parseState`, `parseRetryAfter` | Header strings to values. Unparseable input yields an empty list, or `0` for `retry-after`. |
| `@poe/ggg/errors` | `GggHttpError` | Carries `url`, `status`, `retryable`. |
| `@poe/ggg/types` | `RateLimiter`, `RateLimiterRule`, `RateLimitState`, `CallEvent` | Types only. |

## Examples

### Fetch JSON through a limiter

```ts
import { call } from "@poe/ggg/call";
import { createLimiter } from "@poe/ggg/rate-limiter";

// Starting rules only — the first response replaces them with the server's.
const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);

type FetchResponse = { result: { id: string }[] };

const page = await call<FetchResponse>(
  "https://www.pathofexile.com/api/trade2/fetch/abc,def?query=xyz",
  { limiter },
);

console.log(page.result.length);
```

### POST a body

`content-type: application/json` is added whenever `init.body` is set.

```ts
import { call } from "@poe/ggg/call";

type SearchResponse = { id: string; result: string[] };

const search = await call<SearchResponse>(
  "https://www.pathofexile.com/api/trade2/search/Rise%20of%20the%20Abyssal",
  {
    limiter,
    init: {
      method: "POST",
      body: JSON.stringify({ query: { status: { option: "online" } } }),
    },
  },
);
```

### Retry a transient failure

`retries` is extra attempts after the first, and only 408/429/500/502/503/504 are eligible.
A 429 waits out its hold inside the limiter as well as the backoff.

```ts
const page = await call<FetchResponse>(url, { limiter, retries: 3 });
```

### Watch what the limiter is doing

`wait` and `penalize` are the only place limiter behaviour becomes visible from outside.
The callback runs inline and is never awaited, so it must not throw.

```ts
import { call } from "@poe/ggg/call";
import type { CallEvent } from "@poe/ggg/types";

const log = (searchId: string) => (event: CallEvent) => {
  if (event.type === "wait") console.log(`${searchId}: held ${event.ms}ms`);
  if (event.type === "penalize") {
    console.log(`${searchId}: restricted ${event.seconds}s (${event.source})`);
  }
};

await call(url, { limiter, onEvent: log("first-page") });
```

### Branch on whether a failure is worth repeating

```ts
import { call } from "@poe/ggg/call";
import { GggHttpError } from "@poe/ggg/errors";

try {
  await call(url, { limiter });
} catch (error) {
  if (error instanceof GggHttpError && error.retryable) {
    // requeue — the limiter already holds any restriction the response reported
    return;
  }
  throw error;
}
```

## Environment

| Var | Holds | Example |
| --- | --- | --- |
| `POE_USER_AGENT` | `user-agent` header sent on every request | `poe-stuff/1.0 (contact: you@example.com)` |

This package ships no `.env`. It reads whatever the consuming package loaded with
`node --env-file=packages/<consumer>/.env`, and `requireEnv` throws on the first `call`,
not at import.

GGG asks that the user agent identify the application and give them a way to reach you, so
they can contact the author instead of blocking the traffic. Format:

```
<app>/<version> (contact: <email>)
```

Some clients append their own notes after the contact — an OAuth client id, a site URL.
Keep the contact address real and monitored; a generic browser user agent, or one with no
way to reach anyone, is what gets an IP blocked.

## Gotchas

- **IP tier only.** `applyRateLimits` reads `x-rate-limit-ip` and `x-rate-limit-ip-state`
  by design. Account and client tiers are not consulted; this is built for IP limits.
- **One limiter is one IP.** State is per-instance and per-process. Two limiters running
  in the same process means twice the real request rate against a single budget, and the
  server counts the total.
- **Server rules overwrite yours.** Any non-empty `x-rate-limit-ip` replaces the whole rule
  set. A missing or unparseable header parses to an empty list and is deliberately ignored,
  so the last known rules stay in force rather than resetting to your starting guess.
- **A hold never shrinks.** `penalize` keeps the later deadline. During a restriction every
  in-flight response reports the same one, and a smaller figure arriving afterwards must
  not cut it short.
- **`retries` defaults to 0.** A 429 counts as retryable only because the hold is applied
  before the error leaves `call`. Leave it at 0 wherever a job queue owns retries; raising
  it without the limiter in the loop is what escalates a ban.
- **Rules carry one slot of headroom.** `parseRules` subtracts 1 from each limit, because
  the state header describes the previous response and the last slot in a window is the
  one most likely to be wrong.

## How to run

No CLI entry point — this is a library. Consuming packages own the run scripts and the
`--env-file` that supplies `POE_USER_AGENT`.

Run the tests:

```bash
yarn test packages/ggg
```

Type-check the workspace:

```bash
yarn typecheck
```

## Diagrams

Mermaid `.mmd` sources in `packages/ggg/docs/`, viewable in any Mermaid renderer.

| File | Shows |
| --- | --- |
| `call.mmd` | One `call`, attempt by attempt: acquire a slot, fetch, fold the response's limits back into the limiter, then body / `GggHttpError` / backoff. Colour-coded by phase, with the `onEvent` emissions annotated where they fire. |

`call.mmd` matches `call.ts` as written.
