import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileCache } from "@util/cache/file-cache";
import { call, currentHour } from "./call.ts";
import { PoeWatchHttpError } from "./errors.ts";
import type { CachedResponse } from "./types.ts";

const URL_A = "https://api.poe.watch/compact?league=X&all=true";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let dir: string;
let fetchMock: jest.Mock<typeof fetch>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "poe-watch-call-"));
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

afterEach(async () => {
  jest.useRealTimers();
  await rm(dir, { recursive: true, force: true });
});

describe("call", () => {
  it("sends the user agent and asks for JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));

    await call(URL_A, "1", { baseUrl: "", userAgent: "me/1" });

    expect(fetchMock).toHaveBeenCalledWith(URL_A, {
      headers: { "user-agent": "me/1", accept: "application/json" },
    });
  });

  it("returns the parsed body as-is", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [1, 2] }));

    const body = await call(URL_A, "1", { baseUrl: "", userAgent: "u" });

    expect(body).toEqual({ items: [1, 2] });
  });

  it("downloads again on every call when no cache is given", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ n: 1 }));
    const context = { baseUrl: "", userAgent: "u" };

    await call(URL_A, "1", context);
    await call(URL_A, "1", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws an HTTP error naming the URL and status on a 503", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));

    const error = await call(URL_A, "1", { baseUrl: "", userAgent: "u" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PoeWatchHttpError);
    expect(error).toMatchObject({ url: URL_A, status: 503 });
  });

  it("writes nothing to the cache when the answer is an error", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    const cache = fileCache<CachedResponse>(dir);

    await expect(call(URL_A, "1", { baseUrl: "", userAgent: "u", cache })).rejects.toThrow("poewatch 404 for " + URL_A);

    expect(await readdir(dir)).toEqual([]);
  });

  it("lets a network failure reach the caller unchanged", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(call(URL_A, "1", { baseUrl: "", userAgent: "u" })).rejects.toThrow("fetch failed");
  });

  it("answers the second call with the same URL and hour from the cache", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ n: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: fileCache<CachedResponse>(dir) };

    await call(URL_A, "100", context);
    const second = await call(URL_A, "100", context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ n: 1 });
  });

  it("downloads again once the hour changes", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ n: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: fileCache<CachedResponse>(dir) };

    await call(URL_A, "100", context);
    await call(URL_A, "101", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a different URL in a different cache entry", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ n: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: fileCache<CachedResponse>(dir) };

    await call(URL_A, "100", context);
    await call(URL_A.replace("&all=true", ""), "100", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stores the URL, status, body and write time of a fresh answer", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-02T03:04:05.000Z") });
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    const writes: CachedResponse[] = [];
    const cache = {
      get: async () => undefined,
      set: async (_key: string, value: CachedResponse) => {
        writes.push(value);
      },
    };

    await call(URL_A, "1", { baseUrl: "", userAgent: "u", cache });

    expect(writes).toEqual([{ url: URL_A, status: 200, body: { n: 1 }, storedAt: "2026-01-02T03:04:05.000Z" }]);
  });

  it("serves a cached entry even when it recorded an error status", async () => {
    const cache = {
      get: async () => ({ url: URL_A, status: 500, body: { stale: true }, storedAt: "" }),
      set: async () => undefined,
    };

    const body = await call(URL_A, "1", { baseUrl: "", userAgent: "u", cache });

    expect(body).toEqual({ stale: true });
    expect(fetchMock).not.toHaveBeenCalled();
  }); // status never checked on read
});

describe("currentHour", () => {
  it("counts whole hours since the epoch", () => {
    jest.useFakeTimers({ now: 3_600_000 * 5 + 3_599_999 });

    expect(currentHour()).toBe("5");
  });

  it("rolls over exactly on the hour", () => {
    jest.useFakeTimers({ now: 3_600_000 * 6 });

    expect(currentHour()).toBe("6");
  });
});
