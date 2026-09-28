import { afterEach, beforeEach, describe, it, expect, jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileCache } from "@util/cache/create-file-cache";
import { call } from "./call.ts";
import { GggHttpError } from "./errors.ts";
import type { CachedResponse, CallEvent, RateLimiter, RateLimiterRule, RateLimitState } from "./types.ts";

const URL_ = "https://example.test/api/thing";
const UA = "test-agent/1.0 (contact: a@b.test)";

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };

let fetchMock: jest.Mock<typeof fetch>;

function reply(...replies: Reply[]) {
  for (const r of replies) {
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify(r.body ?? {}), {
          status: r.status ?? 200,
          headers: r.headers ?? {},
        }),
    );
  }
}

function spyLimiter() {
  const log = {
    rules: [] as RateLimiterRule[][],
    states: [] as RateLimitState[][],
    penalties: [] as number[],
  };
  const limiter: RateLimiter = {
    acquire: async () => {},
    explainWait: () => "because",
    setRules: (r) => void log.rules.push(r),
    observe: (s) => void log.states.push(s),
    penalize: (s) => void log.penalties.push(s),
  };
  return { limiter, log };
}

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("call", () => {
  describe("the request", () => {
    it("sends a plain GET with the user agent, asks for JSON and hands back the body", async () => {
      reply({ body: { ok: 1 } });

      const body = await call(URL_, { userAgent: UA });

      expect(body).toEqual({ ok: 1 });
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe(URL_);
      expect(init?.method).toBeUndefined();
      expect(init?.headers).toEqual({ "user-agent": UA, accept: "application/json" });
    }); // no content-type without a body

    it("marks a request with a body as JSON and passes its method and body through", async () => {
      reply({});

      await call(URL_, { userAgent: UA, init: { method: "POST", body: "{}" } });

      const init = fetchMock.mock.calls[0]![1]!;
      expect(init.method).toBe("POST");
      expect(init.body).toBe("{}");
      expect(init.headers).toEqual({
        "user-agent": UA,
        accept: "application/json",
        "content-type": "application/json",
      });
    }); // content-type added only when body is present

    it("lets the caller's own headers win over the defaults", async () => {
      reply({});

      await call(URL_, {
        userAgent: UA,
        init: { headers: { accept: "text/plain", "x-extra": "1" } },
      });

      expect(fetchMock.mock.calls[0]![1]!.headers).toEqual({
        "user-agent": UA,
        accept: "text/plain",
        "x-extra": "1",
      });
    }); // caller headers are spread last
  });

  describe("failures", () => {
    it("fails a 404 as not worth retrying, and asks only once even with three retries allowed", async () => {
      reply({ status: 404 });

      const error = await call(URL_, { userAgent: UA, retries: 3 }).catch((e) => e);

      expect(error).toBeInstanceOf(GggHttpError);
      expect(error).toMatchObject({ url: URL_, status: 404, retryable: false });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }); // retries apply to retryable statuses only

    it("fails a 503 as worth retrying but asks only once when no retries are allowed", async () => {
      reply({ status: 503 });

      const result = call(URL_, { userAgent: UA });

      await expect(result).rejects.toMatchObject({ status: 503, retryable: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }); // retries default to zero; a job queue owns them

    it("retries a 503 after half a second, then again after one more second", async () => {
      jest.useFakeTimers();
      reply({ status: 503 }, { status: 503 }, { body: "done" });

      const result = call(URL_, { userAgent: UA, retries: 2 });
      await jest.advanceTimersByTimeAsync(499);
      const at499 = fetchMock.mock.calls.length;
      await jest.advanceTimersByTimeAsync(1);
      const at500 = fetchMock.mock.calls.length;
      await jest.advanceTimersByTimeAsync(1_000);

      expect(at499).toBe(1);
      expect(at500).toBe(2);
      expect(await result).toBe("done");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }); // backoff doubles: 500ms, 1000ms

    it("gives up with the last error once the retries run out", async () => {
      jest.useFakeTimers();
      reply({ status: 500 }, { status: 502 });

      const result = call(URL_, { userAgent: UA, retries: 1 }).catch((e) => e);
      await jest.advanceTimersByTimeAsync(500);

      expect(await result).toMatchObject({ status: 502 });
    }); // the second status, not the first

    it("lets a network failure reach the caller without retrying it", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

      const result = call(URL_, { userAgent: UA, retries: 2 });

      await expect(result).rejects.toThrow("fetch failed");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }); // only HTTP statuses are retried
  });

  describe("rate-limit headers", () => {
    it("hands the server's rules and spent counts to the limiter", async () => {
      const { limiter, log } = spyLimiter();
      reply({
        headers: {
          "x-rate-limit-ip": "10:5:60",
          "x-rate-limit-ip-state": "2:5:0",
        },
      });

      await call(URL_, { userAgent: UA, limiter });

      expect(log.rules).toEqual([[{ max: 9, windowMs: 6_000 }]]);
      expect(log.states).toEqual([[{ hits: 2, windowSeconds: 5, restrictedSeconds: 0 }]]);
      expect(log.penalties).toEqual([]);
    }); // parsed rules carry headroom and skew

    it("leaves the limiter's rules alone when the response carries no rate-limit headers", async () => {
      const { limiter, log } = spyLimiter();
      reply({});

      await call(URL_, { userAgent: UA, limiter });

      expect(log.rules).toEqual([]);
      expect(log.states).toEqual([]);
    }); // an empty list must not wipe the rules

    it("holds the limiter for thirty seconds when a 200 says a tier is restricted", async () => {
      const { limiter, log } = spyLimiter();
      reply({ headers: { "x-rate-limit-ip-state": "10:5:30" } });

      await call(URL_, { userAgent: UA, limiter });

      expect(log.penalties).toEqual([30]);
    }); // restriction can arrive on a success

    it("holds a 429 for its 45-second retry-after on top of the state's 30-second restriction", async () => {
      const { limiter, log } = spyLimiter();
      reply({
        status: 429,
        headers: { "x-rate-limit-ip-state": "10:5:30", "retry-after": "45" },
      });

      await call(URL_, { userAgent: UA, limiter }).catch(() => {});

      expect(log.penalties).toEqual([30, 45]);
    }); // both applied; the limiter keeps the longer

    it("holds a 429 that names no duration for sixty seconds", async () => {
      const { limiter, log } = spyLimiter();
      reply({ status: 429 });

      await call(URL_, { userAgent: UA, limiter }).catch(() => {});

      expect(log.penalties).toEqual([60]);
    }); // fallback when a proxy answered

    it("holds a 429 whose retry-after is zero for zero seconds, not sixty", async () => {
      const { limiter, log } = spyLimiter();
      reply({ status: 429, headers: { "retry-after": "0" } });

      await call(URL_, { userAgent: UA, limiter }).catch(() => {});

      expect(log.penalties).toEqual([0]);
    }); // 0 is a duration, ?? not ||

    it("still fails a 429 as retryable when there is no limiter to hold", async () => {
      reply({ status: 429 });

      const result = call(URL_, { userAgent: UA });

      await expect(result).rejects.toMatchObject({ status: 429, retryable: true });
    }); // limiter is optional for unpaced endpoints
  });

  describe("events", () => {
    it("reports request, response and limits in that order, and no wait at full budget", async () => {
      const { limiter } = spyLimiter();
      const events: CallEvent[] = [];
      reply({ headers: { "x-rate-limit-policy": "trade-fetch" } });

      await call(URL_, { userAgent: UA, limiter, onEvent: (e) => events.push(e) });

      expect(events.map((e) => e.type)).toEqual(["request", "response", "limits"]);
      expect(events[0]).toEqual({ type: "request", url: URL_, method: "GET", attempt: 0 });
      expect(events[2]).toMatchObject({ policy: "trade-fetch", rules: [], state: [] });
    }); // a 0ms wait is suppressed as noise

    it("reports a 250ms wait with the limiter's reason when acquiring held", async () => {
      jest.useFakeTimers();
      const { limiter } = spyLimiter();
      limiter.acquire = () => new Promise((r) => setTimeout(r, 250));
      const events: CallEvent[] = [];
      reply({});

      const result = call(URL_, { userAgent: UA, limiter, onEvent: (e) => events.push(e) });
      await jest.advanceTimersByTimeAsync(250);
      await result;

      expect(events[0]).toEqual({ type: "wait", ms: 250, reason: "because" });
    }); // measured off the faked clock

    it("reports a retry with its half-second backoff and numbers the attempts from zero", async () => {
      jest.useFakeTimers();
      const events: CallEvent[] = [];
      reply({ status: 408 }, {});

      const result = call(URL_, { userAgent: UA, retries: 1, onEvent: (e) => events.push(e) });
      await jest.advanceTimersByTimeAsync(500);
      await result;

      expect(events).toContainEqual({ type: "retry", url: URL_, status: 408, backoffMs: 500 });
      expect(events.filter((e) => e.type === "request").map((e) => (e as { attempt: number }).attempt)).toEqual([0, 1]);
    }); // 408 is in the retryable set
  });

  describe("cache", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "ggg-call-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("answers a repeated request from the cache without fetching or taking a slot", async () => {
      const cache = createFileCache<CachedResponse>(dir);
      const { limiter } = spyLimiter();
      const acquire = jest.spyOn(limiter, "acquire");
      reply({ body: { n: 1 } });
      await call(URL_, { userAgent: UA, cache, limiter });

      const second = await call(URL_, { userAgent: UA, cache, limiter });

      expect(second).toEqual({ n: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(acquire).toHaveBeenCalledTimes(1);
    }); // a hit spends no budget

    it("reports a store on the first call and a hit on the second", async () => {
      const cache = createFileCache<CachedResponse>(dir);
      const events: CallEvent[] = [];
      reply({});

      await call(URL_, { userAgent: UA, cache, onEvent: (e) => events.push(e) });
      await call(URL_, { userAgent: UA, cache, onEvent: (e) => events.push(e) });

      expect(events.filter((e) => e.type === "cache").map((e) => (e as { result: string }).result)).toEqual([
        "stored",
        "hit",
      ]);
    }); // a miss emits nothing of its own

    it("never stores a failed answer, so the next call asks again", async () => {
      const cache = createFileCache<CachedResponse>(dir);
      reply({ status: 404 }, { body: "fine" });

      await call(URL_, { userAgent: UA, cache }).catch(() => {});
      const second = await call(URL_, { userAgent: UA, cache });

      expect(second).toBe("fine");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }); // a stored 429 would replay an expired ban

    it("keeps two requests with different bodies apart", async () => {
      const cache = createFileCache<CachedResponse>(dir);
      reply({ body: "a" }, { body: "b" });

      const a = await call(URL_, { userAgent: UA, cache, init: { method: "POST", body: "1" } });
      const b = await call(URL_, { userAgent: UA, cache, init: { method: "POST", body: "2" } });

      expect([a, b]).toEqual(["a", "b"]);
    }); // body is in the key

    it("keeps two requests with different salts apart", async () => {
      const cache = createFileCache<CachedResponse>(dir);
      reply({ body: "a" }, { body: "b" });

      const a = await call(URL_, { userAgent: UA, cache, cacheSalt: "1" });
      const b = await call(URL_, { userAgent: UA, cache, cacheSalt: "2" });

      expect([a, b]).toEqual(["a", "b"]);
    }); // the hour salt of the digests

    it("refuses to cache a request whose body is not a string, before sending anything", async () => {
      const cache = createFileCache<CachedResponse>(dir);

      const result = call(URL_, { userAgent: UA, cache, init: { method: "POST", body: new URLSearchParams("a=1") } });

      await expect(result).rejects.toThrow(TypeError);
      expect(fetchMock).not.toHaveBeenCalled();
    }); // a stream cannot be hashed without consuming it

    it("stores the URL, status and body with the time it was written", async () => {
      const store = new Map<string, CachedResponse>();
      reply({ body: { n: 1 } });

      await call(URL_, {
        userAgent: UA,
        cache: { get: async (k) => store.get(k), set: async (k, v) => void store.set(k, v) },
      });

      const [entry] = [...store.values()];
      expect(entry).toMatchObject({ url: URL_, status: 200, body: { n: 1 } });
      expect(Number.isNaN(Date.parse(entry!.storedAt))).toBe(false);
    }); // the envelope, not the bare body
  });
});
