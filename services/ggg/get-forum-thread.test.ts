import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { forumThreadUrl, getForumThread } from "./get-forum-thread.ts";
import type { GggContext } from "./types.ts";

const FORUM_URL = "https://www.example.test/forum";
const THREAD = "<html><body>patch notes</body></html>";

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
  fetchMock = jest.fn<FetchLike>(
    async () => new Response(THREAD, { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("forumThreadUrl", () => {
  it("spells out where one thread lives on the forum base it was given", () => {
    expect(forumThreadUrl(3_600_123, FORUM_URL)).toBe(
      `${FORUM_URL}/view-thread/3600123`,
    );
  });
});

describe("getForumThread", () => {
  it("asks for HTML rather than JSON", async () => {
    await getForumThread(3_600_123, context());

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<
      string,
      string
    >;
    expect(headers["accept"]).toBe("text/html");
  });

  it("hands the thread back as raw text", async () => {
    const thread = await getForumThread(3_600_123, context());

    expect(thread).toBe(THREAD);
  });
});
