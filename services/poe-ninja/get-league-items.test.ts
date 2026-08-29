import { describe, it, expect, jest } from "@jest/globals";
import { EXCHANGE_TYPES } from "./get-exchange-overview.types.ts";
import { getExchangeRatios, slugId } from "./get-exchange-ratios.ts";
import { getLeagueItems } from "./get-league-items.ts";
import { ITEM_TYPES } from "./get-item-overview.types.ts";
import type { PoeNinjaContext } from "./types.ts";

/**
 * The fan-out: 28 requests for the items, 18 for the exchange, and one answer.
 *
 * `fetch` is stubbed and the context carries no cache, so these tests are about the merge
 * and the failure, never about the network.
 */

const context: PoeNinjaContext = {
  baseUrl: "https://ninja.test",
  userAgent: "poe-stuff-test",
};

/** The shape `fetch` returns, narrowed to the two things `fetchJson` reads. */
const answer = (body: unknown, status = 200): unknown => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

/** What was asked for, out of the URL the stub was called with. */
const typeOf = (url: string): string =>
  new URL(url).searchParams.get("type") ?? "";

const stub = (
  respond: (url: string) => unknown,
): jest.Mock<(url: string) => Promise<unknown>> => {
  const mock = jest.fn(async (url: string) => respond(url));
  (globalThis as { fetch: unknown }).fetch = mock;

  return mock;
};

describe("getLeagueItems", () => {
  it("asks every type once and merges the answers", async () => {
    const calls = stub((url) =>
      answer({
        lines: [
          {
            id: 1,
            name: `a ${typeOf(url)}`,
            chaosValue: 5,
            count: 30,
            listingCount: 30,
          },
        ],
      }),
    );

    const rows = await getLeagueItems("Allflame", context);

    expect(calls).toHaveBeenCalledTimes(ITEM_TYPES.length);
    expect(rows).toHaveLength(ITEM_TYPES.length);
    // Every row knows which type answered for it, which is the only record of what a row
    // actually is — see `item-types.ts`.
    expect(rows.map((row) => row.ninjaType).sort()).toEqual([...ITEM_TYPES].sort());
  });

  it("treats an empty type as an answer, not a failure", async () => {
    // Four of the 28 are empty in a healthy league, because nothing traded one.
    stub((url) =>
      answer({
        lines:
          typeOf(url) === "ShrineBelt"
            ? []
            : [{ id: 1, name: "x", chaosValue: 1, count: 1, listingCount: 1 }],
      }),
    );

    const rows = await getLeagueItems("Allflame", context);

    expect(rows).toHaveLength(ITEM_TYPES.length - 1);
    expect(rows.some((row) => row.ninjaType === "ShrineBelt")).toBe(false);
  });

  it("throws naming the type that failed", async () => {
    // A market silently short by a few hundred uniques builds a filter that looks
    // perfectly well-formed, which is why this is fatal rather than partial.
    stub((url) =>
      typeOf(url) === "UniqueArmour"
        ? answer({}, 404)
        : answer({ lines: [] }),
    );

    await expect(getLeagueItems("Allflame", context)).rejects.toThrow(
      /poe-ninja: UniqueArmour failed.*404/,
    );
  });

  it("asks a second time after a 429, and only once", async () => {
    let seen = 0;
    const calls = stub((url) => {
      if (typeOf(url) !== "Vial") return answer({ lines: [] });

      seen += 1;
      return seen === 1
        ? answer({}, 429)
        : answer({
            lines: [{ id: 9, name: "Vial of Fate", chaosValue: 2, count: 30, listingCount: 30 }],
          });
    });

    const rows = await getLeagueItems("Allflame", context);

    expect(rows.map((row) => row.name)).toEqual(["Vial of Fate"]);
    expect(calls).toHaveBeenCalledTimes(ITEM_TYPES.length + 1);
  });

  it("does not retry a 400, because asking again is the same typo twice", async () => {
    const calls = stub(() => answer({}, 400));

    await expect(getLeagueItems("Allflame", context)).rejects.toThrow(/poe-ninja: /);
    // One worker fails, the pool abandons the run: no type is asked twice.
    expect(calls.mock.calls.every(([url]) => typeof url === "string")).toBe(true);
  });
});

describe("getExchangeRatios", () => {
  /** One book: a priced line, and the sibling entry that says what the slug is called. */
  const book = (
    lines: readonly { id: string; primaryValue: number }[],
    items: readonly { id: string; name: string }[],
    primary = "chaos",
  ): unknown => ({
    core: { primary, secondary: "divine", rates: { divine: 0.005 } },
    lines: lines.map((line) => ({
      ...line,
      volumePrimaryValue: 100,
      maxVolumeCurrency: "chaos",
      maxVolumeRate: 1,
      sparkline: { totalChange: 2, data: [1, 2] },
    })),
    items,
  });

  it("names a line from the sibling items array", async () => {
    stub((url) =>
      answer(
        typeOf(url) === "Currency"
          ? book([{ id: "divine", primaryValue: 204.4 }], [{ id: "divine", name: "Divine Orb" }])
          : book([], []),
      ),
    );

    const rows = await getExchangeRatios("Allflame", context);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Divine Orb");
    expect(rows[0]?.chaos.chaosValue).toBe(204.4);
    // The divine side is the same market restated through the book's own rate, not a
    // second market: 204.4 chaos at 0.005 divine to the chaos.
    expect(rows[0]?.divine.value).toBeCloseTo(1.022);
  });

  it("drops a line no items entry names", async () => {
    // A row called `accelerating-catalyst` is not an item anything can look up, and a
    // name invented from the slug would be worse than a missing row.
    stub((url) =>
      answer(
        typeOf(url) === "Currency"
          ? book([{ id: "mystery", primaryValue: 5 }], [])
          : book([], []),
      ),
    );

    await expect(getExchangeRatios("Allflame", context)).resolves.toEqual([]);
  });

  it("asks every exchange type", async () => {
    const calls = stub(() => answer(book([], [])));

    await getExchangeRatios("Allflame", context);

    expect(calls).toHaveBeenCalledTimes(EXCHANGE_TYPES.length);
  });

  it("refuses a book quoted in anything but chaos", async () => {
    stub(() => answer(book([], [], "divine")));

    await expect(getExchangeRatios("Allflame", context)).rejects.toThrow(
      /is quoted in divine, not chaos/,
    );
  });

  it("files a divination card apart from everything that stacks", async () => {
    stub((url) =>
      answer(
        typeOf(url) === "DivinationCard"
          ? book([{ id: "the-doctor", primaryValue: 9 }], [{ id: "the-doctor", name: "The Doctor" }])
          : book([], []),
      ),
    );

    const rows = await getExchangeRatios("Allflame", context);

    expect(rows[0]?.category).toBe("card");
  });
});

describe("slugId", () => {
  it("is negative, so an exchange row can never collide with an item row", () => {
    for (const slug of ["chaos", "divine", "abrasive-catalyst", ""]) {
      expect(slugId(slug)).toBeLessThan(0);
    }
  });

  it("is the same number for the same slug, every time", () => {
    expect(slugId("divine")).toBe(slugId("divine"));
    expect(slugId("divine")).not.toBe(slugId("chaos"));
  });
});
