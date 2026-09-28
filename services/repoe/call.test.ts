import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileCache } from "@util/cache/create-file-cache";
import { call, currentHour } from "./call.ts";
import { RepoeHttpError, RepoeParseError } from "./errors.ts";
import type { CachedResponse } from "./types.ts";

const URL = "https://repoe.test/base_items.json";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let dir: string;
let fetchMock: jest.Mock<typeof fetch>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "repoe-call-"));
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

afterEach(async () => {
  jest.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("call", () => {
  it("sends the caller's user agent and asks for JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await call(URL, "1", { baseUrl: "", userAgent: "me/1" });

    expect(fetchMock).toHaveBeenCalledWith(URL, {
      headers: { "user-agent": "me/1", accept: "application/json" },
    });
  }); // the request itself is the contract with GitHub Pages

  it("returns whatever JSON came back, even a shape nobody expected", async () => {
    fetchMock.mockResolvedValue(jsonResponse([1, "two"]));

    const body = await call(URL, "1", { baseUrl: "", userAgent: "u" });

    expect(body).toEqual([1, "two"]);
  }); // asserted, not validated

  it("fails with an error naming the URL and the 404 it answered with", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));

    const error = await call(URL, "1", { baseUrl: "", userAgent: "u" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RepoeHttpError);
    expect(error).toMatchObject({ url: URL, status: 404 });
  }); // thrown before the body is read

  it("fails with a parse error naming the URL when a 200 carries an empty body", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));

    const error = await call(URL, "1", { baseUrl: "", userAgent: "u" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RepoeParseError);
    expect(error).toMatchObject({ url: URL });
  }); // json() rejection is rewrapped

  it("downloads the file again on every call when it has no cache", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ a: 1 }));
    const context = { baseUrl: "", userAgent: "u" };

    await call(URL, "1", context);
    await call(URL, "1", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // no cache means no key at all

  it("answers a second call with the same salt from the cache without downloading", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ a: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: createFileCache<CachedResponse>(dir) };

    await call(URL, "1", context);
    const second = await call(URL, "1", context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ a: 1 });
  }); // round-trips through a real file cache

  it("downloads again once the salt changes", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ a: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: createFileCache<CachedResponse>(dir) };

    await call(URL, "1", context);
    await call(URL, "2", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // salt is part of the key

  it("stores the URL, status, body and time alongside the answer", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }));
    const set = jest.fn(async (_key: string, _value: CachedResponse) => {});
    const cache = { get: async () => undefined, set };

    await call(URL, "1", { baseUrl: "", userAgent: "u", cache });

    expect(set).toHaveBeenCalledWith(expect.stringMatching(/^repoe_[0-9a-f]{64}$/), {
      url: URL,
      status: 200,
      body: { a: 1 },
      storedAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    });
  }); // the envelope, not the bare body

  it("caches nothing when the download answers 500", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const cache = createFileCache<CachedResponse>(dir);

    await call(URL, "1", { baseUrl: "", userAgent: "u", cache }).catch(() => {});

    expect(await readdir(dir)).toEqual([]);
  }); // a failure must not be replayed for the rest of the hour

  it("caches nothing when a 200 carries a body that is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    const cache = createFileCache<CachedResponse>(dir);

    await call(URL, "1", { baseUrl: "", userAgent: "u", cache }).catch(() => {});

    expect(await readdir(dir)).toEqual([]);
  }); // parse throws before the write
});

describe("currentHour", () => {
  it("still reads the fifth hour one millisecond before the sixth begins", () => {
    jest.spyOn(Date, "now").mockReturnValue(3_600_000 * 5 + 3_599_999);

    const hour = currentHour();

    expect(hour).toBe("5");
  }); // floor, not round

  it("moves to the sixth hour exactly on the hour", () => {
    jest.spyOn(Date, "now").mockReturnValue(3_600_000 * 6);

    const hour = currentHour();

    expect(hour).toBe("6");
  }); // the edge belongs to the new hour
});
