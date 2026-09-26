import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPoeNinjaService } from "./service.ts";
import { slugId } from "./get-exchange-ratios.ts";
import { EXCHANGE_TYPES, ITEM_TYPES } from "./types.ts";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

const queryOf = (url: string): URLSearchParams => new URL(url).searchParams;

describe("createPoeNinjaService", () => {
  it("asks poe.ninja with the default user agent when nothing is configured", async () => {
    fetchMock.mockResolvedValue(json([{ id: "Allflame" }]));

    const leagues = await createPoeNinjaService().getLeagues();

    expect(leagues).toEqual([{ id: "Allflame" }]);
    expect(fetchMock).toHaveBeenCalledWith("https://poe.ninja/poe1/api/economy/leagues", {
      headers: { "user-agent": "poe-stuff/1.0", accept: "application/json" },
    });
  });

  it("strips one trailing slash off a configured base URL", async () => {
    fetchMock.mockResolvedValue(json([]));

    await createPoeNinjaService({ baseUrl: "https://mirror.test/", userAgent: "me" }).getLeagues();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://mirror.test/poe1/api/economy/leagues");
  });

  describe("getItemOverview", () => {
    it("asks the stash overview for one league and type and returns its lines", async () => {
      fetchMock.mockResolvedValue(json({ lines: [{ id: 1 }] }));

      const lines = await createPoeNinjaService().getItemOverview("Allflame", "Vial");

      expect(lines).toEqual([{ id: 1 }]);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://poe.ninja/poe1/api/economy/stash/current/item/overview?league=Allflame&type=Vial",
      );
    });

    it("answers an envelope with no lines as an empty list", async () => {
      fetchMock.mockResolvedValue(json({}));

      expect(await createPoeNinjaService().getItemOverview("Allflame", "Vial")).toEqual([]);
    });
  });

  describe("getExchangeOverview", () => {
    it("asks the exchange overview and returns the whole book", async () => {
      const book = { core: { primary: "chaos" }, lines: [], items: [] };
      fetchMock.mockResolvedValue(json(book));

      const answer = await createPoeNinjaService().getExchangeOverview("Allflame", "Scarab");

      expect(answer).toEqual(book);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Allflame&type=Scarab",
      );
    });
  });

  describe("getLeagueItems", () => {
    it("asks once per item type and returns rows in type order, each tagged with its type", async () => {
      fetchMock.mockImplementation(async (url) => {
        const type = queryOf(String(url)).get("type");
        return json({ lines: [{ id: 1, name: `${type}`, chaosValue: 1, count: 20, listingCount: 1 }] });
      });

      const rows = await createPoeNinjaService().getLeagueItems("Allflame");

      expect(fetchMock).toHaveBeenCalledTimes(ITEM_TYPES.length);
      expect(rows.map((row) => row.ninjaType)).toEqual([...ITEM_TYPES]);
    });

    it("fails the whole market naming the type that failed", async () => {
      fetchMock.mockImplementation(async (url) =>
        queryOf(String(url)).get("type") === "Beast" ? json({}, 404) : json({ lines: [] }),
      );

      await expect(createPoeNinjaService().getLeagueItems("Allflame")).rejects.toThrow(
        "poe-ninja: Beast failed: poe-ninja 404 for",
      );
    });
  });

  describe("getExchangeRatios", () => {
    const book = (type: string, primary = "chaos", rates: Record<string, number> = { divine: 0.005 }) => ({
      core: { primary, secondary: "divine", rates },
      lines:
        type === "Scarab"
          ? [
              { id: "gilded", primaryValue: 40, volumePrimaryValue: 9, maxVolumeCurrency: "", maxVolumeRate: 0, sparkline: { totalChange: 3, data: [] } },
              { id: "nameless", primaryValue: 1, volumePrimaryValue: 1, maxVolumeCurrency: "", maxVolumeRate: 0 },
            ]
          : [],
      items: [{ id: "gilded", name: "Gilded Scarab" }],
    });

    it("names each line from the book's items, drops lines with no name, and files it by the type asked", async () => {
      fetchMock.mockImplementation(async (url) => json(book(queryOf(String(url)).get("type") ?? "")));

      const rows = await createPoeNinjaService().getExchangeRatios("Allflame");

      expect(fetchMock).toHaveBeenCalledTimes(EXCHANGE_TYPES.length);
      expect(rows).toEqual([
        {
          id: slugId("gilded"),
          name: "Gilded Scarab",
          icon: "",
          category: "scarab",
          chaos: { value: 40, lowConfidence: false, timestamp: 0, volume: 9, change24H: 3, chaosValue: 40, divineValue: 0.2 },
          divine: { value: 0.2, lowConfidence: false, timestamp: 0, volume: 9, change24H: 3, chaosValue: 40, divineValue: 0.2 },
        },
      ]);
    });

    it("omits divineValue when the book publishes no rate to the other side", async () => {
      fetchMock.mockImplementation(async (url) => json(book(queryOf(String(url)).get("type") ?? "", "chaos", {})));

      const [row] = await createPoeNinjaService().getExchangeRatios("Allflame");

      expect(row?.divine.value).toBe(0);
      expect(row?.chaos).not.toHaveProperty("divineValue");
    });

    it("refuses a book quoted in anything but chaos, naming the type", async () => {
      fetchMock.mockImplementation(async (url) => {
        const type = queryOf(String(url)).get("type") ?? "";
        return json(book(type, type === "Oil" ? "divine" : "chaos"));
      });

      await expect(createPoeNinjaService().getExchangeRatios("Allflame")).rejects.toThrow(
        "poe-ninja: Oil failed: poe-ninja: Oil is quoted in divine, not chaos",
      );
    });
  });
});

describe("slugId", () => {
  it("gives the same slug the same negative id every time", () => {
    expect(slugId("divine")).toBe(slugId("divine"));
    expect(slugId("divine")).toBeLessThan(0);
  });

  it("gives the empty slug the FNV offset basis, shifted off zero", () => {
    expect(slugId("")).toBe(-(0x811c9dc5 + 1));
  });

  it("gives two different slugs different ids", () => {
    expect(slugId("chaos")).not.toBe(slugId("divine"));
  });
});
