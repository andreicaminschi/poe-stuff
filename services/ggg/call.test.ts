import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { cacheKey } from "@util/core/cache-key";
import { call as callWithOptions } from "./call.ts";
import type { CallOptions } from "./call.ts";
import { GggHttpError } from "./errors.ts";
import type {
  CachedResponse,
  CallEvent,
  RateLimiterRule,
  RateLimitState,
} from "./types.ts";

const ENDPOINT = "https://api.example.test/trade/search";
const USER_AGENT = "poe-stuff-test/1.0 (contact: nobody@example.test)";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// Everything the call reaches out to lands in one ordered log, because several of the
// guarantees here are about sequence rather than about any single argument.
let order: string[] = [];

let events: CallEvent[] = [];

function fakeLimiter() {
  return {
    acquire: jest.fn(async (): Promise<void> => {
      order.push("acquire");
    }),
    setRules: jest.fn<(next: RateLimiterRule[]) => void>(),
    observe: jest.fn<(state: RateLimitState[]) => void>(),
    explainWait: jest.fn<() => string | undefined>(),
    penalize: jest.fn((seconds: number): void => {
      order.push(`penalize:${seconds}`);
    }),
  };
}

let limiter = fakeLimiter();
let fetchMock = jest.fn<FetchLike>();

/**
 * Every case wants the same user agent, so it is filled in here rather than repeated at
 * fifty call sites. A case that cares about the header passes its own.
 */
const call = (
  url: string,
  options: Omit<CallOptions, "userAgent"> & { userAgent?: string },
): Promise<unknown> =>
  callWithOptions(url, { userAgent: USER_AGENT, ...options });

// The clock starts at 0 so the retry-after date in one test is readable arithmetic.
beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  order = [];
  events = [];
  limiter = fakeLimiter();
  fetchMock = jest.fn<FetchLike>();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
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

const collect = (event: CallEvent): void => {
  events.push(event);
};

const eventsOfType = <K extends CallEvent["type"]>(type: K) =>
  events.filter(
    (event): event is Extract<CallEvent, { type: K }> => event.type === type,
  );

/** The key `call` builds for a request, worked out the same way the source does. */
const keyFor = (url: string, method: string, body = "") =>
  cacheKey("ggg", method, url, body);

/** Starts warm for whatever is passed in, and records everything written to it. */
function fakeCache(stored: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (key: string): Promise<CachedResponse | undefined> => {
      const body = stored[key];
      return body === undefined
        ? undefined
        : { url: ENDPOINT, status: 200, body, storedAt: new Date(0).toISOString() };
    }),
    set: jest.fn<(key: string, value: CachedResponse) => Promise<void>>(
      async () => {},
    ),
  };
}

/** A limiter that really holds, so the frozen clock moves and `wait` can be non-zero. */
function holdFor(ms: number): void {
  limiter.acquire.mockImplementation(async () => {
    order.push("acquire");
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  });
}

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
    it("identifies itself with the user agent it was handed", async () => {
      respondWith(ok({}));

      await call(ENDPOINT, { limiter, userAgent: "somebody-else/2.0" });

      expect(headersSentOn(0)["user-agent"]).toBe("somebody-else/2.0");
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
        { max: 11, windowMs: 61_000 },
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

  describe("the events it reports", () => {
    describe("waiting for a slot", () => {
      it("says nothing about waiting when a slot was free the moment it asked", async () => {
        respondWith(ok({}));

        await call(ENDPOINT, { limiter, onEvent: collect });

        expect(eventsOfType("wait")).toEqual([]);
      });

      it("reports a quarter-second wait when the limiter held it that long", async () => {
        holdFor(250);
        respondWith(ok({}));

        const pending = call(ENDPOINT, { limiter, onEvent: collect });
        await jest.advanceTimersByTimeAsync(250);
        await pending;

        expect(eventsOfType("wait")).toEqual([{ type: "wait", ms: 250 }]);
      });
    });

    describe("the request going out", () => {
      it("reports the request as a GET when the caller named no method", async () => {
        respondWith(ok({}));

        await call(ENDPOINT, { limiter, onEvent: collect });

        expect(eventsOfType("request")[0]?.method).toBe("GET");
      });

      it("reports the caller's own method when a search posts its query", async () => {
        respondWith(ok({}));

        await call(ENDPOINT, {
          limiter,
          onEvent: collect,
          init: { method: "POST", body: '{"query":{}}' },
        });

        expect(eventsOfType("request")[0]?.method).toBe("POST");
      });

      it("reports the first attempt as attempt zero", async () => {
        respondWith(ok({}));

        await call(ENDPOINT, { limiter, onEvent: collect });

        expect(eventsOfType("request")[0]?.attempt).toBe(0);
      });
    });

    describe("the response coming back", () => {
      it("reports the status of a rejection, not only of a success", async () => {
        respondWith(rejected(404));

        await failureOf(call(ENDPOINT, { limiter, onEvent: collect }));

        expect(eventsOfType("response")[0]?.status).toBe(404);
      });

      it("measures only the time the network took, not the time spent queued", async () => {
        holdFor(250);
        fetchMock.mockImplementation(async () => {
          order.push("fetch");
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 100);
          });
          return ok({});
        });

        const pending = call(ENDPOINT, { limiter, onEvent: collect });
        await jest.advanceTimersByTimeAsync(350);
        await pending;

        expect(eventsOfType("response")[0]?.durationMs).toBe(100);
      });
    });

    describe("a hold it was told to take", () => {
      it("blames the state header when a tier reports itself restricted", async () => {
        respondWith(ok({}, { "x-rate-limit-ip-state": "5:60:90" }));

        await call(ENDPOINT, { limiter, onEvent: collect });

        expect(eventsOfType("penalize")).toEqual([
          { type: "penalize", seconds: 90, source: "state" },
        ]);
      });

      it("blames the retry-after header when a rejection asks for thirty seconds", async () => {
        respondWith(rejected(429, { "retry-after": "30" }));

        await failureOf(call(ENDPOINT, { limiter, onEvent: collect }));

        expect(eventsOfType("penalize")).toEqual([
          { type: "penalize", seconds: 30, source: "retry-after" },
        ]);
      });

      it("blames nothing but its own default when a rejection names no duration", async () => {
        respondWith(rejected(429));

        await failureOf(call(ENDPOINT, { limiter, onEvent: collect }));

        expect(eventsOfType("penalize")).toEqual([
          { type: "penalize", seconds: 60, source: "fallback" },
        ]);
      });

      it("calls a rejection that asks for zero seconds a default, not a retry-after", async () => {
        respondWith(rejected(429, { "retry-after": "0" }));

        await failureOf(call(ENDPOINT, { limiter, onEvent: collect }));

        expect(eventsOfType("penalize")).toEqual([
          { type: "penalize", seconds: 60, source: "fallback" },
        ]);
      });

      it("reports two separate holds when a rejection carries a restricted tier and a retry-after", async () => {
        respondWith(
          rejected(429, {
            "x-rate-limit-ip-state": "5:60:90",
            "retry-after": "30",
          }),
        );

        await failureOf(call(ENDPOINT, { limiter, onEvent: collect }));

        expect(eventsOfType("penalize")).toEqual([
          { type: "penalize", seconds: 90, source: "state" },
          { type: "penalize", seconds: 30, source: "retry-after" },
        ]);
      });
    });

    describe("trying again", () => {
      it("reports the half-second backoff before it waits that half second out", async () => {
        respondWith(rejected(503), ok({}));

        const pending = call(ENDPOINT, {
          limiter,
          retries: 1,
          onEvent: collect,
        });
        await jest.advanceTimersByTimeAsync(499);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(eventsOfType("retry")).toEqual([
          { type: "retry", url: ENDPOINT, status: 503, backoffMs: 500 },
        ]);

        await jest.advanceTimersByTimeAsync(1);
        await pending;
      });

      it("says nothing about trying again on the attempt that gives up", async () => {
        respondWith(rejected(503));

        await failureOf(
          call(ENDPOINT, { limiter, retries: 1, onEvent: collect }),
        );

        expect(eventsOfType("response")).toHaveLength(2);
        expect(eventsOfType("retry")).toHaveLength(1);
      });

      it("reports one retried call in order: wait, request, response, limits, hold, retry, then the same again", async () => {
        holdFor(250);
        respondWith(rejected(429, { "retry-after": "30" }), ok({}));

        const pending = call(ENDPOINT, {
          limiter,
          retries: 1,
          onEvent: collect,
        });
        await jest.advanceTimersByTimeAsync(2000);
        await pending;

        expect(events.map((event) => event.type)).toEqual([
          "wait",
          "request",
          "response",
          "limits",
          "penalize",
          "retry",
          "wait",
          "request",
          "response",
          "limits",
        ]);
        expect(eventsOfType("request").map((event) => event.attempt)).toEqual([
          0, 1,
        ]);
      });
    });

    describe("a listener that misbehaves", () => {
      it("fails the whole request when the caller's listener throws", async () => {
        respondWith(ok({}));
        const blewUp = new Error("listener blew up");

        await expect(
          call(ENDPOINT, {
            limiter,
            onEvent: () => {
              throw blewUp;
            },
          }),
        ).rejects.toThrow(blewUp);
      });
    });
  });

  describe("a cache it was given", () => {
    it("answers from the cache without taking a slot or making a request", async () => {
      respondWith(ok({ result: ["live"] }));
      const cache = fakeCache({
        [keyFor(ENDPOINT, "GET")]: { result: ["stored"] },
      });

      const body = await call(ENDPOINT, { limiter, cache, onEvent: collect });

      expect(body).toEqual({ result: ["stored"] });
      expect(order).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("leaves the limiter untouched on a hit, however stale the answer is", async () => {
      const cache = fakeCache({
        [keyFor(ENDPOINT, "GET")]: { result: [] },
      });

      await call(ENDPOINT, { limiter, cache });

      expect(limiter.acquire).not.toHaveBeenCalled();
      expect(limiter.setRules).not.toHaveBeenCalled();
      expect(limiter.penalize).not.toHaveBeenCalled();
    });

    it("stores the body of a successful answer it had to go and get", async () => {
      respondWith(ok({ result: ["live"] }));
      const cache = fakeCache();

      await call(ENDPOINT, { limiter, cache });

      expect(cache.set).toHaveBeenCalledWith(keyFor(ENDPOINT, "GET"), {
        url: ENDPOINT,
        status: 200,
        body: { result: ["live"] },
        storedAt: new Date(0).toISOString(),
      });
    });

    it("keys a POST by its body, so two queries never share an answer", async () => {
      respondWith(ok({}));
      const cache = fakeCache();
      const body = '{"query":{"status":"online"}}';

      await call(ENDPOINT, {
        limiter,
        cache,
        init: { method: "POST", body },
      });

      expect(cache.set).toHaveBeenCalledWith(
        keyFor(ENDPOINT, "POST", body),
        expect.anything(),
      );
    });

    it("stores nothing when every attempt failed", async () => {
      respondWith(rejected(500));
      const cache = fakeCache();

      await failureOf(call(ENDPOINT, { limiter, cache, retries: 1 }));

      expect(cache.set).not.toHaveBeenCalled();
    });

    it("refuses a request it cannot key rather than keying it wrongly", async () => {
      respondWith(ok({}));
      const cache = fakeCache();

      await expect(
        call(ENDPOINT, {
          limiter,
          cache,
          init: { method: "POST", body: new Uint8Array([1, 2, 3]) },
        }),
      ).rejects.toThrow(TypeError);
    });

    it("reports the hit and the store, and says nothing on a miss", async () => {
      respondWith(ok({ result: [] }));
      const cache = fakeCache();

      await call(ENDPOINT, { limiter, cache, onEvent: collect });
      expect(eventsOfType("cache")).toEqual([
        { type: "cache", result: "stored", key: keyFor(ENDPOINT, "GET") },
      ]);

      events = [];
      const warm = fakeCache({ [keyFor(ENDPOINT, "GET")]: { result: [] } });

      await call(ENDPOINT, { limiter, cache: warm, onEvent: collect });
      expect(eventsOfType("cache")).toEqual([
        { type: "cache", result: "hit", key: keyFor(ENDPOINT, "GET") },
      ]);
    });
  });
});
