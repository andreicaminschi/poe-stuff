import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPoeWatchService } from "./service.ts";
import type { CachedResponse } from "./types.ts";

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ items: [] })));
  globalThis.fetch = fetchMock;
});

const firstRequest = () => fetchMock.mock.calls[0];

describe("createPoeWatchService", () => {
  it("talks to api.poe.watch as poe-stuff/1.0 when given nothing", async () => {
    await createPoeWatchService().getCompactData("X");

    expect(firstRequest()).toEqual([
      "https://api.poe.watch/compact?league=X&all=true",
      { headers: { "user-agent": "poe-stuff/1.0", accept: "application/json" } },
    ]);
  });

  it("strips a trailing slash from a given base URL", async () => {
    await createPoeWatchService({ baseUrl: "https://pw.test/" }).getCorruptionData("X");

    expect(firstRequest()?.[0]).toBe("https://pw.test/corruptions?league=X&all=true");
  });

  it("sends the given user agent", async () => {
    await createPoeWatchService({ userAgent: "me/2" }).getExchangeRatios("X", "poe1");

    expect(firstRequest()?.[1]).toEqual({
      headers: { "user-agent": "me/2", accept: "application/json" },
    });
  });

  it("reads through the given cache before downloading", async () => {
    const cache = {
      get: async (): Promise<CachedResponse> => ({
        url: "",
        status: 200,
        body: { items: ["hit"] },
        storedAt: "",
      }),
      set: async () => undefined,
    };

    const items = await createPoeWatchService({ cache }).getCompactData("X");

    expect(items).toEqual(["hit"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
