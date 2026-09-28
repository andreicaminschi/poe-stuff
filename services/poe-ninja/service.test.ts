import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPoeNinjaService } from "./service.ts";
import { slugId } from "./get-exchange-ratios.ts";
import { EXCHANGE_TYPES, ITEM_TYPES } from "./types.ts";

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

const queryOf = (url: string): URLSearchParams => new URL(url).searchParams;

describe("createPoeNinjaService", () => {
  it("asks poe.ninja as poe-stuff/1.0 when nothing is configured", async () => {
    fetchMock.mockResolvedValue(json([{ id: "Allflame" }]));

    const leagues = await createPoeNinjaService().getLeagues();

    expect(leagues).toEqual([{ id: "Allflame" }]);
    expect(fetchMock).toHaveBeenCalledWith("https://poe.ninja/poe1/api/economy/leagues", {
      headers: { "user-agent": "poe-stuff/1.0", accept: "application/json" },
    });
  }); // both defaults at once

  it("joins onto a mirror given with a trailing slash without doubling it", async () => {
    fetchMock.mockResolvedValue(json([]));

    await createPoeNinjaService({ baseUrl: "https://mirror.test/", userAgent: "me" }).getLeagues();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://mirror.test/poe1/api/economy/leagues");
  }); // trimmed once at construction

  describe("one kind of item", () => {
    it("asks the stash overview for one league and type and hands back its lines", async () => {
      fetchMock.mockResolvedValue(json({ lines: [{ id: 1 }] }));

      const lines = await createPoeNinjaService().getItemOverview("Allflame", "Vial");

      expect(lines).toEqual([{ id: 1 }]);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://poe.ninja/poe1/api/economy/stash/current/item/overview?league=Allflame&type=Vial",
      );
    }); // unwraps lines

    it("answers an overview with no lines as an empty list", async () => {
      fetchMock.mockResolvedValue(json({}));

      const lines = await createPoeNinjaService().getItemOverview("Allflame", "Vial");

      expect(lines).toEqual([]);
    }); // ?? [] fallback

    it("asks the exchange overview and hands back the whole book", async () => {
      const book = { core: { primary: "chaos" }, lines: [], items: [] };
      fetchMock.mockResolvedValue(json(book));

      const answer = await createPoeNinjaService().getExchangeOverview("Allflame", "Scarab");

      expect(answer).toEqual(book);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Allflame&type=Scarab",
      );
    }); // core, lines and items all kept
  });

  describe("a whole league's items", () => {
    it("asks once per item type and returns rows in type order, each tagged with the type it came from", async () => {
      fetchMock.mockImplementation(async (url) => {
        const type = queryOf(String(url)).get("type");
        return json({ lines: [{ id: 1, name: `${type}`, chaosValue: 1, count: 20, listingCount: 1 }] });
      });

      const rows = await createPoeNinjaService().getLeagueItems("Allflame");

      expect(fetchMock).toHaveBeenCalledTimes(ITEM_TYPES.length);
      expect(rows.map((row) => row.ninjaType)).toEqual([...ITEM_TYPES]);
    }); // order survives the four-at-a-time fan-out

    it("fails the whole market, naming Beast, when only the beast request fails", async () => {
      fetchMock.mockImplementation(async (url) =>
        queryOf(String(url)).get("type") === "Beast"
          ? json({}, 404)
          : json({ lines: [] }),
      );

      const market = createPoeNinjaService().getLeagueItems("Allflame");

      await expect(market).rejects.toThrow("poe-ninja: Beast failed: poe-ninja 404 for");
    }); // half a market is not a market
  });

  describe("a whole league's exchange", () => {
    const book = (type: string, primary = "chaos", rates: Record<string, number> = { divine: 0.005 }) => ({
      core: { primary, secondary: "divine", rates },
      lines:
        type === "Scarab"
          ? [
              {
                id: "gilded",
                primaryValue: 40,
                volumePrimaryValue: 9,
                maxVolumeCurrency: "",
                maxVolumeRate: 0,
                sparkline: { totalChange: 3, data: [] },
              },
              { id: "nameless", primaryValue: 1, volumePrimaryValue: 1, maxVolumeCurrency: "", maxVolumeRate: 0 },
            ]
          : [],
      items: [{ id: "gilded", name: "Gilded Scarab" }],
    });

    it("names each line from the book's items, drops a line nothing names, and files it under the type asked", async () => {
      fetchMock.mockImplementation(async (url) => json(book(queryOf(String(url)).get("type") ?? "")));

      const rows = await createPoeNinjaService().getExchangeRatios("Allflame");

      expect(fetchMock).toHaveBeenCalledTimes(EXCHANGE_TYPES.length);
      expect(rows).toEqual([
        {
          id: slugId("gilded"),
          name: "Gilded Scarab",
          icon: "",
          category: "scarab",
          chaos: {
            value: 40,
            lowConfidence: false,
            timestamp: 0,
            volume: 9,
            change24H: 3,
            chaosValue: 40,
            divineValue: 0.2,
          },
          divine: {
            value: 0.2,
            lowConfidence: false,
            timestamp: 0,
            volume: 9,
            change24H: 3,
            chaosValue: 40,
            divineValue: 0.2,
          },
        },
      ]);
    }); // 40 chaos at 0.005 divine per chaos is 0.2 divine

    it("prices the divine side at zero and leaves the divine value off when the book publishes no rate", async () => {
      fetchMock.mockImplementation(async (url) => json(book(queryOf(String(url)).get("type") ?? "", "chaos", {})));

      const [row] = await createPoeNinjaService().getExchangeRatios("Allflame");

      expect(row?.divine.value).toBe(0);
      expect(row?.chaos).not.toHaveProperty("divineValue");
    }); // no rate is not a rate of zero

    it("refuses a book quoted in divine, naming the Oil type it came from", async () => {
      fetchMock.mockImplementation(async (url) => {
        const type = queryOf(String(url)).get("type") ?? "";
        return json(book(type, type === "Oil"
          ? "divine"
          : "chaos"));
      });

      const exchange = createPoeNinjaService().getExchangeRatios("Allflame");

      await expect(exchange).rejects.toThrow("poe-ninja: Oil failed: poe-ninja: Oil is quoted in divine, not chaos");
    }); // prices would be read in the wrong currency
  });
});

describe("slugId", () => {
  it("gives the same slug the same id every time", () => {
    const first = slugId("divine");

    const second = slugId("divine");

    expect(second).toBe(first);
  }); // a hash, not a counter

  it("gives every slug a negative id so it can never collide with an item's own", () => {
    const id = slugId("divine");

    expect(id).toBeLessThan(0);
  }); // item overview ids are positive

  it("gives the empty slug an id one past the FNV offset basis, never zero", () => {
    const id = slugId("");

    expect(id).toBe(-(0x811c9dc5 + 1));
  }); // shifted so no slug maps to -0

  it("gives two different slugs different ids", () => {
    const chaos = slugId("chaos");

    const divine = slugId("divine");

    expect(chaos).not.toBe(divine);
  }); // no trivial collision
});
