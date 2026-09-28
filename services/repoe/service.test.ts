import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileCache } from "@util/cache/create-file-cache";
import { createRepoeService } from "./service.ts";
import type { RepoeService } from "./service.ts";
import type { CachedResponse } from "./types.ts";

let dir: string;
let fetchMock: jest.Mock<typeof fetch>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "repoe-service-"));
  fetchMock = jest.fn<typeof fetch>(async () => new Response("{\"k\":1}"));
  globalThis.fetch = fetchMock;
});

afterEach(async () => {
  jest.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const requestedUrl = () => fetchMock.mock.calls[0]?.[0];
const requestedHeaders = () => (fetchMock.mock.calls[0]?.[1] as RequestInit).headers;

describe("createRepoeService", () => {
  it.each<[keyof RepoeService, string]>([
    ["getBaseItems", "/base_items.json"],
    ["getGems", "/pob-data/poe1/Gems.min.json"],
    ["getSpectres", "/pob-data/poe1/Spectres.json"],
    ["getEssences", "/pob-data/poe1/Essence.min.json"],
    ["getClusterJewels", "/cluster_jewels.json"],
    ["getFoulbornMap", "/pob-data/poe1/ModFoulbornMap.json"],
    ["getMods", "/mods.json"],
  ])("downloads %s from %s on the default site and hands the file back untouched", async (method, path) => {
    const body = await createRepoeService()[method]();

    expect(requestedUrl()).toBe(`https://repoe-fork.github.io${path}`);
    expect(body).toEqual({ k: 1 });
  }); // only Gems and Essence take the .min variant

  it("introduces itself as poe-stuff/1.0 when nobody names a user agent", async () => {
    await createRepoeService().getMods();

    expect(requestedHeaders()).toEqual({
      "user-agent": "poe-stuff/1.0",
      accept: "application/json",
    });
  }); // unlike GGG, RePoE may default

  it("sends the user agent it was built with", async () => {
    await createRepoeService({ userAgent: "me/2" }).getMods();

    expect(requestedHeaders()).toMatchObject({ "user-agent": "me/2" });
  }); // option overrides the default

  it("joins onto a mirror given with a trailing slash without doubling it", async () => {
    await createRepoeService({ baseUrl: "https://mirror.test/" }).getMods();

    expect(requestedUrl()).toBe("https://mirror.test/mods.json");
  }); // trimmed once at construction

  it("answers a repeat call within the same hour from the cache it was given", async () => {
    jest.spyOn(Date, "now").mockReturnValue(3_600_000 * 10);
    const service = createRepoeService({ cache: createFileCache<CachedResponse>(dir) });

    await service.getGems();
    await service.getGems();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  }); // the hour is the salt

  it("downloads again when the second call lands one millisecond into the next hour", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(3_600_000 * 10 + 3_599_999);
    const service = createRepoeService({ cache: createFileCache<CachedResponse>(dir) });

    await service.getGems();
    now.mockReturnValue(3_600_000 * 11);
    await service.getGems();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // salt read per call, not at construction

  it("keeps two different files apart in one cache", async () => {
    const service = createRepoeService({ cache: createFileCache<CachedResponse>(dir) });

    await service.getGems();
    await service.getMods();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // the URL is part of the key
});
