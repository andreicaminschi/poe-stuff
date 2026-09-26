import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileCache } from "@util/cache/file-cache";
import { call, currentHour } from "./call.ts";
import { RepoeHttpError } from "./errors.ts";
import type { CachedResponse } from "./types.ts";

const URL = "https://repoe.test/base_items.json";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

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
  it("sends the user agent and asks for JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await call(URL, "1", { baseUrl: "", userAgent: "me/1" });

    expect(fetchMock).toHaveBeenCalledWith(URL, {
      headers: { "user-agent": "me/1", accept: "application/json" },
    });
  });

  it("returns the parsed body as it came, without validating it", async () => {
    fetchMock.mockResolvedValue(jsonResponse([1, "two"]));

    const body = await call(URL, "1", { baseUrl: "", userAgent: "u" });

    expect(body).toEqual([1, "two"]);
  });

  it("throws an error naming the URL and status on a non-2xx answer", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));

    const error = await call(URL, "1", { baseUrl: "", userAgent: "u" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(RepoeHttpError);
    expect(error).toMatchObject({ url: URL, status: 404 });
  });

  it("rejects a body that is not JSON with a parse error naming the URL", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));

    const error = await call(URL, "1", { baseUrl: "", userAgent: "u" }).catch(
      (e: unknown) => e,
    );

    expect(error).toMatchObject({ name: "RepoeParseError", url: URL });
  });

  it("downloads again on every call when no cache is given", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ a: 1 }));
    const context = { baseUrl: "", userAgent: "u" };

    await call(URL, "1", context);
    await call(URL, "1", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("answers the second call with the same salt from the cache", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ a: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: fileCache<CachedResponse>(dir) };

    await call(URL, "1", context);
    const second = await call(URL, "1", context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ a: 1 });
  });

  it("downloads again once the salt changes", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ a: 1 }));
    const context = { baseUrl: "", userAgent: "u", cache: fileCache<CachedResponse>(dir) };

    await call(URL, "1", context);
    await call(URL, "2", context);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stores the URL, status, body and time of the answer", async () => {
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
  });

  it("caches nothing when the download fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const cache = fileCache<CachedResponse>(dir);

    await call(URL, "1", { baseUrl: "", userAgent: "u", cache }).catch(() => {});

    expect(await readdir(dir)).toEqual([]);
  });
});

describe("currentHour", () => {
  it("counts whole hours since the epoch", () => {
    jest.spyOn(Date, "now").mockReturnValue(3_600_000 * 5 + 3_599_999);

    expect(currentHour()).toBe("5");
  });

  it("moves to the next hour exactly on the hour", () => {
    jest.spyOn(Date, "now").mockReturnValue(3_600_000 * 6);

    expect(currentHour()).toBe("6");
  });
});
