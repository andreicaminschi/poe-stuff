import { describe, it, expect } from "@jest/globals";
import { tradeSearchUrl } from "./trade-url.ts";

const queryOf = (url: string) => JSON.parse(new URL(url).searchParams.get("q")!);

describe("tradeSearchUrl", () => {
  it("opens the live site for the league, escaped", () => {
    const url = tradeSearchUrl({ league: "Hardcore Allflame", type: "Ring" });

    expect(url.startsWith("https://www.pathofexile.com/trade/search/Hardcore%20Allflame?q=")).toBe(true);
  });

  it("asks for a unique by name and type, instant buyout only", () => {
    expect(queryOf(tradeSearchUrl({ league: "L", name: "Headhunter", type: "Leather Belt" }))).toEqual({
      query: { status: { option: "securable" }, name: "Headhunter", type: "Leather Belt" },
    });
  });

  it("adds no filters when neither foulborn nor corrupted is named", () => {
    expect(queryOf(tradeSearchUrl({ league: "L", type: "Ring" })).query.filters).toBeUndefined();
  });

  it("asks for foulborn as the mutated filter and corruption as its own, false included", () => {
    const q = queryOf(tradeSearchUrl({ league: "L", foulborn: true, corrupted: false }));

    expect(q.query.filters).toEqual({
      misc_filters: {
        filters: { mutated: { option: "true" }, corrupted: { option: "false" } },
      },
    });
  });

  it("uses a given site with its trailing slash trimmed", () => {
    expect(tradeSearchUrl({ league: "L", siteUrl: "https://x.test/s/" })).toMatch(/^https:\/\/x\.test\/s\/L\?q=/);
  });
});
