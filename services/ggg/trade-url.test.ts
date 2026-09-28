import { describe, it, expect } from "@jest/globals";
import { tradeSearchUrl } from "./trade-url.ts";

const queryOf = (url: string) => JSON.parse(new URL(url).searchParams.get("q")!);

describe("tradeSearchUrl", () => {
  it("opens the live trade site on a league whose name has a space, escaped", () => {
    const url = tradeSearchUrl({ league: "Hardcore Allflame", type: "Ring" });

    expect(url.startsWith("https://www.pathofexile.com/trade/search/Hardcore%20Allflame?q=")).toBe(true);
  }); // league is a path segment

  it("asks for a unique by name and base, instant buyout only", () => {
    const url = tradeSearchUrl({ league: "L", name: "Headhunter", type: "Leather Belt" });

    expect(queryOf(url)).toEqual({
      query: { status: { option: "securable" }, name: "Headhunter", type: "Leather Belt" },
    });
  }); // securable is always on

  it("asks for a base by its type alone, with no name", () => {
    const url = tradeSearchUrl({ league: "L", type: "Ring" });

    expect(queryOf(url)).toEqual({ query: { status: { option: "securable" }, type: "Ring" } });
  }); // absent keys stay absent, no filters block

  it("asks for foulborn through the mutated filter and for uncorrupted as corrupted false", () => {
    const url = tradeSearchUrl({ league: "L", foulborn: true, corrupted: false });

    expect(queryOf(url).query.filters).toEqual({
      misc_filters: {
        filters: { mutated: { option: "true" }, corrupted: { option: "false" } },
      },
    });
  }); // false is a filter, not the absence of one

  it("asks for corrupted items without saying anything about foulborn", () => {
    const url = tradeSearchUrl({ league: "L", corrupted: true });

    expect(queryOf(url).query.filters).toEqual({ misc_filters: { filters: { corrupted: { option: "true" } } } });
  }); // one misc filter alone

  it("uses a given site with its trailing slash trimmed", () => {
    const url = tradeSearchUrl({ league: "L", siteUrl: "https://x.test/s/" });

    expect(url).toMatch(/^https:\/\/x\.test\/s\/L\?q=/);
  }); // no double slash before the league
});
