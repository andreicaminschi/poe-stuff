import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { call } from "./call.ts";
import { GggHttpError } from "./errors.ts";
import type { RateLimiterRule } from "./types.ts";

const ENDPOINT = "https://api.example.test/trade/search";
const USER_AGENT = "poe-stuff-test/1.0 (contact: nobody@example.test)";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// Everything the call reaches out to lands in one ordered log, because several of the
// guarantees here are about sequence rather than about any single argument.
let order: string[] = [];

function fakeLimiter() {
  return {
    acquire: jest.fn(async (): Promise<void> => {
      order.push("acquire");
    }),
    setRules: jest.fn<(next: RateLimiterRule[]) => void>(),
    penalize: jest.fn((seconds: number): void => {
      order.push(`penalize:${seconds}`);
    }),
  };
}

let limiter = fakeLimiter();
let fetchMock = jest.fn<FetchLike>();

// The clock starts at 0 so the retry-after date in one test is readable arithmetic.
beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  order = [];
  limiter = fakeLimiter();
  fetchMock = jest.fn<FetchLike>();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.POE_USER_AGENT = USER_AGENT;
});

afterEach(() => {
  jest.useRealTimers();
  delete process.env.POE_USER_AGENT;
});

/** Answers each attempt in turn; the last response repeats for any further attempt. */
function respondWith(...responses: Response[]): void {
  let attempt = 0;
  fetchMock.mockImplementation(async () => {
    order.push("fetch");
    const response = responses[Math.min(attempt, responses.length - 1)]!;
    attempt += 1;
    return response;
  });
}

const ok = (body: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), { status: 200, headers });

const rejected = (status: number, headers?: Record<string, string>) =>
  new Response("", { status, headers });

const headersSentOn = (attempt: number) =>
  (fetchMock.mock.calls[attempt]?.[1]?.headers ?? {}) as Record<string, string>;

/** Runs the call out to its last retry and hands back the error it ended on. */
async function failureOf(pending: Promise<unknown>): Promise<GggHttpError> {
  const settled = pending.then(
    (value): unknown => value,
    (error: unknown): unknown => error,
  );

  await jest.advanceTimersByTimeAsync(60_000);
  const outcome = await settled;

  if (!(outcome instanceof GggHttpError)) {
    throw new Error(`expected a GggHttpError, got ${String(outcome)}`);
  }
  return outcome;
}

describe("call", () => {
  describe("the outgoing request", () => {
    it("identifies itself with the user agent configured in the environment", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, { limiter });

      expect(headersSentOn(0)["user-agent"]).toBe(USER_AGENT);
    });

    it("asks for JSON back", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, { limiter });

      expect(headersSentOn(0).accept).toBe("application/json");
    });

    it("declares a JSON content type when there is a body to send", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, {
        limiter,
        init: { method: "POST", body: '{"query":{}}' },
      });

      expect(headersSentOn(0)["content-type"]).toBe("application/json");
    });

    it("sends no content type when there is no body", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, { limiter, init: { method: "POST" } });

      expect(headersSentOn(0)["content-type"]).toBeUndefined();
    });

    it("lets the caller replace any header it sets by default", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, {
        limiter,
        init: { headers: { accept: "text/plain" } },
      });

      expect(headersSentOn(0).accept).toBe("text/plain");
    });

    it("keeps the caller's method and body", async () => {
      const payload = '{"query":{"status":"online"}}';
      respondWith(ok({}));

      await call(ENDPOINT, {
        limiter,
        init: { method: "POST", body: payload },
      });

      expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
      expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(payload);
    });
  });

  describe("a successful response", () => {
    it("returns the decoded JSON body", async () => {
      respondWith(ok({ result: ["one", "two"], total: 2 }));

      const body = await call(ENDPOINT, { limiter });

      expect(body).toEqual({ result: ["one", "two"], total: 2 });
    });

    it("waits for a rate-limit slot before touching the network", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, { limiter });

      expect(order).toEqual(["acquire", "fetch"]);
    });

    it("feeds the server's limits back even when nothing went wrong", async () => {
      respondWith(ok({}, { "x-rate-limit-ip-state": "5:60:90" }));

      await call(ENDPOINT, { limiter });

      expect(limiter.penalize).toHaveBeenCalledWith(90);
    });
  });

  describe("a response the server will never succeed at", () => {
    it("fails with the status and URL of the answer it got", async () => {
      respondWith(rejected(404));

      const error = await failureOf(call(ENDPOINT, { limiter }));

      expect(error.status).toBe(404);
      expect(error.url).toBe(ENDPOINT);
    });

    it("gives up immediately even when retries were budgeted", async () => {
      respondWith(rejected(404));

      await failureOf(call(ENDPOINT, { limiter, retries: 3 }));

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("a response worth trying again", () => {
    it("fails on the first try when no retries were budgeted", async () => {
      respondWith(rejected(503));

      const error = await failureOf(call(ENDPOINT, { limiter }));

      expect(error.retryable).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns the body when the second try succeeds", async () => {
      respondWith(rejected(503), ok({ result: ["recovered"] }));

      const pending = call(ENDPOINT, { limiter, retries: 1 });
      await jest.advanceTimersByTimeAsync(500);

      expect(await pending).toEqual({ result: ["recovered"] });
    });

    it("tries three times in total when two retries were budgeted", async () => {
      respondWith(rejected(503));

      await failureOf(call(ENDPOINT, { limiter, retries: 2 }));

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("fails with the status of the last attempt, not the first", async () => {
      respondWith(rejected(503), rejected(500));

      const error = await failureOf(call(ENDPOINT, { limiter, retries: 1 }));

      expect(error.status).toBe(500);
    });

    it("waits half a second before the second try and a full second before the third", async () => {
      respondWith(rejected(503));
      void call(ENDPOINT, { limiter, retries: 2 }).catch(() => undefined);

      await jest.advanceTimersByTimeAsync(499);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("takes a fresh rate-limit slot for every attempt", async () => {
      respondWith(rejected(503), ok({}));

      const pending = call(ENDPOINT, { limiter, retries: 1 });
      await jest.advanceTimersByTimeAsync(500);
      await pending;

      expect(order).toEqual(["acquire", "fetch", "acquire", "fetch"]);
    });
  });

  describe("what the response teaches the limiter", () => {
    it("adopts the request budget the server states", async () => {
      respondWith(ok({}, { "x-rate-limit-ip": "12:60:300" }));

      await call(ENDPOINT, { limiter });

      expect(limiter.setRules).toHaveBeenCalledWith([
        { max: 11, windowMs: 60_000 },
      ]);
    });

    it("keeps the budget it already had when the server states none", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, { limiter });

      expect(limiter.setRules).not.toHaveBeenCalled();
    });

    it("holds off for as long as any tier says it is restricted", async () => {
      respondWith(ok({}, { "x-rate-limit-ip-state": "5:60:30,9:300:120" }));

      await call(ENDPOINT, { limiter });

      expect(limiter.penalize.mock.calls).toEqual([[30], [120]]);
    });

    it("ignores tiers that report no restriction", async () => {
      respondWith(ok({}, { "x-rate-limit-ip-state": "5:60:0,9:300:0" }));

      await call(ENDPOINT, { limiter });

      expect(limiter.penalize).not.toHaveBeenCalled();
    });

    it("holds for the number of seconds a rejection asks for", async () => {
      respondWith(rejected(429, { "retry-after": "30" }));

      await failureOf(call(ENDPOINT, { limiter }));

      expect(limiter.penalize.mock.calls).toEqual([[30]]);
    });

    it("reads a rejection that names a wall-clock deadline instead of a duration", async () => {
      const inThirtySeconds = new Date(Date.now() + 30_000).toUTCString();
      respondWith(rejected(429, { "retry-after": inThirtySeconds }));

      await failureOf(call(ENDPOINT, { limiter }));

      expect(limiter.penalize.mock.calls).toEqual([[30]]);
    });

    it("holds for a minute when a rejection names no duration at all", async () => {
      respondWith(rejected(429));

      await failureOf(call(ENDPOINT, { limiter }));

      expect(limiter.penalize.mock.calls).toEqual([[60]]);
    });

    it("holds for a minute when a rejection asks for zero seconds", async () => {
      respondWith(rejected(429, { "retry-after": "0" }));

      await failureOf(call(ENDPOINT, { limiter }));

      expect(limiter.penalize.mock.calls).toEqual([[60]]);
    });

    it("still takes its penalty on a rejection it has run out of retries for", async () => {
      respondWith(rejected(429));

      await failureOf(call(ENDPOINT, { limiter, retries: 2 }));

      expect(limiter.penalize.mock.calls).toEqual([[60], [60], [60]]);
    });

    it("takes the penalty before waiting to try again", async () => {
      respondWith(rejected(429, { "retry-after": "5" }), ok({}));

      const pending = call(ENDPOINT, { limiter, retries: 1 });
      await jest.advanceTimersByTimeAsync(500);
      await pending;

      expect(order).toEqual([
        "acquire",
        "fetch",
        "penalize:5",
        "acquire",
        "fetch",
      ]);
    });
  });
});
