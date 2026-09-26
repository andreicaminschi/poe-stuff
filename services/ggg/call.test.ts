import { afterEach, beforeEach, describe, it, expect, jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileCache } from "@util/cache/file-cache";
import { call } from "./call.ts";
import { GggHttpError } from "./errors.ts";
import type {
  CachedResponse,
  CallEvent,
  RateLimiter,
  RateLimiterRule,
  RateLimitState,
} from "./types.ts";

const URL_ = "https://example.test/api/thing";
const UA = "test-agent/1.0 (contact: a@b.test)";

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };

let fetchMock: jest.Mock<typeof fetch>;

function reply(...replies: Reply[]) {
  for (const r of replies) {
    fetchMock.mockImplementationOnce(async () =>
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
    it("sends a GET with the user agent and asks for JSON", async () => {
      reply({ body: { ok: 1 } });

      const body = await call(URL_, { userAgent: UA });

      expect(body).toEqual({ ok: 1 });
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe(URL_);
      expect(init?.method).toBeUndefined();
      expect(init?.headers).toEqual({ "user-agent": UA, accept: "application/json" });
    });

    it("marks a request with a body as JSON and passes method and body through", async () => {
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
    });

    it("lets the caller's own headers override the defaults", async () => {
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
    });
  });

  describe("errors", () => {
    it("throws a non-retryable error on a 404 without trying again", async () => {
      reply({ status: 404 });

      const error = await call(URL_, { userAgent: UA, retries: 3 }).catch((e) => e);

      expect(error).toBeInstanceOf(GggHttpError);
      expect(error).toMatchObject({ url: URL_, status: 404, retryable: false });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws a retryable error on a 503 when no retries are allowed", async () => {
      reply({ status: 503 });

      await expect(call(URL_, { userAgent: UA })).rejects.toMatchObject({
        status: 503,
        retryable: true,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("retries a 503 after half a second, then one second", async () => {
      jest.useFakeTimers();
      reply({ status: 503 }, { status: 503 }, { body: "done" });

      const result = call(URL_, { userAgent: UA, retries: 2 });
      await jest.advanceTimersByTimeAsync(499);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(await result).toBe("done");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("gives up with the last error once the retries run out", async () => {
      jest.useFakeTimers();
      reply({ status: 500 }, { status: 502 });

      const result = call(URL_, { userAgent: UA, retries: 1 }).catch((e) => e);
      await jest.advanceTimersByTimeAsync(500);

      expect(await result).toMatchObject({ status: 502 });
    });
  });

  describe("rate-limit headers", () => {
    it("hands the server's rules and state to the limiter", async () => {
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
    });

    it("leaves the limiter's rules alone when the headers are missing", async () => {
      const { limiter, log } = spyLimiter();
      reply({});

      await call(URL_, { userAgent: UA, limiter });

      expect(log.rules).toEqual([]);
      expect(log.states).toEqual([]);
    });

    it("penalizes for a tier the server says is restricted, even on a 200", async () => {
      const { limiter, log } = spyLimiter();
      reply({ headers: { "x-rate-limit-ip-state": "10:5:30" } });

      await call(URL_, { userAgent: UA, limiter });

      expect(log.penalties).toEqual([30]);
    });

    it("penalizes a 429 for the retry-after seconds on top of the state's restriction", async () => {
      const { limiter, log } = spyLimiter();
      reply({
        status: 429,
        headers: { "x-rate-limit-ip-state": "10:5:30", "retry-after": "45" },
      });

      await call(URL_, { userAgent: UA, limiter }).catch(() => {});

      expect(log.penalties).toEqual([30, 45]);
    });

    it("penalizes a 429 with no retry-after for sixty seconds", async () => {
      const { limiter, log } = spyLimiter();
      reply({ status: 429 });

      await call(URL_, { userAgent: UA, limiter }).catch(() => {});

      expect(log.penalties).toEqual([60]);
    });

    it("penalizes a 429 with retry-after of zero for zero seconds", async () => {
      const { limiter, log } = spyLimiter();
      reply({ status: 429, headers: { "retry-after": "0" } });

      await call(URL_, { userAgent: UA, limiter }).catch(() => {});

      expect(log.penalties).toEqual([0]);
    });

    it("does not penalize a 429 when there is no limiter", async () => {
      reply({ status: 429 });

      await expect(call(URL_, { userAgent: UA })).rejects.toMatchObject({
        status: 429,
        retryable: true,
      });
    });
  });

  describe("events", () => {
    it("reports request, response and limits in that order, with no wait at full budget", async () => {
      const { limiter } = spyLimiter();
      const events: CallEvent[] = [];
      reply({ headers: { "x-rate-limit-policy": "trade-fetch" } });

      await call(URL_, { userAgent: UA, limiter, onEvent: (e) => events.push(e) });

      expect(events.map((e) => e.type)).toEqual(["request", "response", "limits"]);
      expect(events[0]).toEqual({ type: "request", url: URL_, method: "GET", attempt: 0 });
      expect(events[2]).toMatchObject({ policy: "trade-fetch", rules: [], state: [] });
    });

    it("reports a wait with the limiter's reason when acquiring took time", async () => {
      jest.useFakeTimers();
      const { limiter } = spyLimiter();
      limiter.acquire = () => new Promise((r) => setTimeout(r, 250));
      const events: CallEvent[] = [];
      reply({});

      const result = call(URL_, { userAgent: UA, limiter, onEvent: (e) => events.push(e) });
      await jest.advanceTimersByTimeAsync(250);
      await result;

      expect(events[0]).toEqual({ type: "wait", ms: 250, reason: "because" });
    });

    it("reports a retry with its backoff", async () => {
      jest.useFakeTimers();
      const events: CallEvent[] = [];
      reply({ status: 408 }, {});

      const result = call(URL_, { userAgent: UA, retries: 1, onEvent: (e) => events.push(e) });
      await jest.advanceTimersByTimeAsync(500);
      await result;

      expect(events).toContainEqual({ type: "retry", url: URL_, status: 408, backoffMs: 500 });
      expect(events.filter((e) => e.type === "request").map((e) => (e as { attempt: number }).attempt))
        .toEqual([0, 1]);
    });
  });

  describe("cache", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "ggg-call-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("answers a repeated request from the cache without fetching or acquiring", async () => {
      const cache = fileCache<CachedResponse>(dir);
      const { limiter } = spyLimiter();
      const acquire = jest.spyOn(limiter, "acquire");
      reply({ body: { n: 1 } });
      await call(URL_, { userAgent: UA, cache, limiter });

      const second = await call(URL_, { userAgent: UA, cache, limiter });

      expect(second).toEqual({ n: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(acquire).toHaveBeenCalledTimes(1);
    });

    it("reports a hit and a store as events", async () => {
      const cache = fileCache<CachedResponse>(dir);
      const events: CallEvent[] = [];
      reply({});

      await call(URL_, { userAgent: UA, cache, onEvent: (e) => events.push(e) });
      await call(URL_, { userAgent: UA, cache, onEvent: (e) => events.push(e) });

      expect(events.filter((e) => e.type === "cache").map((e) => (e as { result: string }).result))
        .toEqual(["stored", "hit"]);
    });

    it("never stores a failed answer", async () => {
      const cache = fileCache<CachedResponse>(dir);
      reply({ status: 404 }, { body: "fine" });

      await call(URL_, { userAgent: UA, cache }).catch(() => {});
      const second = await call(URL_, { userAgent: UA, cache });

      expect(second).toBe("fine");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("keys two different bodies apart", async () => {
      const cache = fileCache<CachedResponse>(dir);
      reply({ body: "a" }, { body: "b" });

      const a = await call(URL_, { userAgent: UA, cache, init: { method: "POST", body: "1" } });
      const b = await call(URL_, { userAgent: UA, cache, init: { method: "POST", body: "2" } });

      expect([a, b]).toEqual(["a", "b"]);
    });

    it("keys two different salts apart", async () => {
      const cache = fileCache<CachedResponse>(dir);
      reply({ body: "a" }, { body: "b" });

      const a = await call(URL_, { userAgent: UA, cache, cacheSalt: "1" });
      const b = await call(URL_, { userAgent: UA, cache, cacheSalt: "2" });

      expect([a, b]).toEqual(["a", "b"]);
    });

    it("refuses to cache a request whose body is not a string", async () => {
      const cache = fileCache<CachedResponse>(dir);

      await expect(
        call(URL_, { userAgent: UA, cache, init: { method: "POST", body: new URLSearchParams("a=1") } }),
      ).rejects.toThrow(TypeError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("stores the url, status and body with a timestamp", async () => {
      const store = new Map<string, CachedResponse>();
      reply({ body: { n: 1 } });

      await call(URL_, {
        userAgent: UA,
        cache: { get: async (k) => store.get(k), set: async (k, v) => void store.set(k, v) },
      });

      const [entry] = [...store.values()];
      expect(entry).toMatchObject({ url: URL_, status: 200, body: { n: 1 } });
      expect(Number.isNaN(Date.parse(entry!.storedAt))).toBe(false);
    });
  });
});
