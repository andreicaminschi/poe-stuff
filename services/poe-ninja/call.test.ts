import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileCache } from "@util/cache/create-file-cache";
import { fetchJson } from "./call.ts";
import { PoeNinjaHttpError } from "./errors.ts";
import type { CachedResponse, PoeNinjaContext } from "./types.ts";

const HOUR_MS = 3_600_000;
const context: PoeNinjaContext = { baseUrl: "https://ninja.test", userAgent: "ua/1" };

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

let fetchMock: jest.Mock<typeof fetch>;
let dir: string | undefined;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

afterEach(async () => {
  jest.useRealTimers();
  if (dir !== undefined) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("fetchJson", () => {
  it("sorts the query by name so two spellings of one query hit the same URL", async () => {
    fetchMock.mockResolvedValue(json({ ok: 1 }));

    const body = await fetchJson("p/a", { type: "Oil", league: "Allflame" }, context);

    expect(body).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith("https://ninja.test/p/a?league=Allflame&type=Oil", {
      headers: { "user-agent": "ua/1", accept: "application/json" },
    });
  });

  it("leaves the question mark off when there is no query", async () => {
    fetchMock.mockResolvedValue(json([]));

    await fetchJson("p/leagues", {}, context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://ninja.test/p/leagues");
  });

  it("encodes spaces in a league name as plus signs", async () => {
    fetchMock.mockResolvedValue(json([]));

    await fetchJson("p", { league: "Hardcore Allflame" }, context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://ninja.test/p?league=Hardcore+Allflame");
  });

  it("fails a 404 at once without asking twice", async () => {
    fetchMock.mockResolvedValue(json({}, 404));

    const error = await fetchJson("p", {}, context).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PoeNinjaHttpError);
    expect(error).toMatchObject({ status: 404, attempts: 1, url: "https://ninja.test/p" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks a 429 again after two seconds and returns the second answer", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({ second: true }));

    const pending = fetchJson("p", {}, context);
    await jest.advanceTimersByTimeAsync(1_999);
    const beforeDelay = fetchMock.mock.calls.length;
    await jest.advanceTimersByTimeAsync(1);

    expect(beforeDelay).toBe(1);
    await expect(pending).resolves.toEqual({ second: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after a second 5xx and says it tried twice", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({}, 503));

    const pending = fetchJson("p", {}, context).catch((caught: unknown) => caught);
    await jest.advanceTimersByTimeAsync(2_000);

    expect(await pending).toMatchObject({ status: 503, attempts: 2 });
  });

  it("makes no request for the same URL again inside the same hour", async () => {
    jest.useFakeTimers({ now: 10 * HOUR_MS, doNotFake: ["setImmediate", "nextTick"] });
    dir = await mkdtemp(join(tmpdir(), "poe-ninja-"));
    const cache = createFileCache<CachedResponse>(dir);
    fetchMock.mockResolvedValueOnce(json({ n: 1 })).mockResolvedValueOnce(json({ n: 2 }));

    const first = await fetchJson("p", { a: "1" }, { ...context, cache });
    jest.setSystemTime(11 * HOUR_MS - 1);
    const second = await fetchJson("p", { a: "1" }, { ...context, cache });

    expect(first).toEqual({ n: 1 });
    expect(second).toEqual({ n: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches again once the clock crosses into the next hour", async () => {
    jest.useFakeTimers({ now: 10 * HOUR_MS, doNotFake: ["setImmediate", "nextTick"] });
    dir = await mkdtemp(join(tmpdir(), "poe-ninja-"));
    const cache = createFileCache<CachedResponse>(dir);
    fetchMock.mockResolvedValueOnce(json({ n: 1 })).mockResolvedValueOnce(json({ n: 2 }));

    await fetchJson("p", {}, { ...context, cache });
    jest.setSystemTime(11 * HOUR_MS);
    const second = await fetchJson("p", {}, { ...context, cache });

    expect(second).toEqual({ n: 2 });
  });

  it("keeps two queries apart in the cache", async () => {
    dir = await mkdtemp(join(tmpdir(), "poe-ninja-"));
    const cache = createFileCache<CachedResponse>(dir);
    fetchMock.mockResolvedValueOnce(json({ t: "a" })).mockResolvedValueOnce(json({ t: "b" }));

    await fetchJson("p", { type: "A" }, { ...context, cache });
    const second = await fetchJson("p", { type: "B" }, { ...context, cache });

    expect(second).toEqual({ t: "b" });
  });

  it("stores nothing when a request fails", async () => {
    const set = jest.fn<(key: string, value: CachedResponse) => Promise<void>>();
    const cache = { get: async () => undefined, set };
    fetchMock.mockResolvedValue(json({}, 400));

    await fetchJson("p", {}, { ...context, cache }).catch(() => undefined);

    expect(set).not.toHaveBeenCalled();
  });
});
