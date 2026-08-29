import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getNewsPage } from "./get-news-page.ts";
import type { GggContext } from "./types.ts";

const FORUM_URL = "https://www.example.test/forum";
const PAGE = "<html><body>announcements</body></html>";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): GggContext => ({
  limiter: {
    acquire: async () => {},
    explainWait: () => undefined,
    setRules: () => {},
    observe: () => {},
    penalize: () => {},
  },
  tradeApiUrl: "https://api.example.test/trade",
  currencyApiUrl: "https://cdn.example.test/currency-exchange",
  forumUrl: FORUM_URL,
  userAgent: "poe-stuff-test/1.0 (contact: nobody@example.test)",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(async () => new Response(PAGE, { status: 200 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getNewsPage", () => {
  it("asks for the numbered page of the news forum", async () => {
    await getNewsPage(3, context());

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${FORUM_URL}/view-forum/news/page/3`,
    );
  });

  it("hands the page back as raw text", async () => {
    const page = await getNewsPage(1, context());

    expect(page).toBe(PAGE);
  });
});
