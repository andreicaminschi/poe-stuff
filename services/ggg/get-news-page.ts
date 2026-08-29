import { call } from "./call.ts";
import type { GggContext } from "./types.ts";

/**
 * One page of the news forum, as HTML.
 *
 * There is no API behind this — GGG publishes announcements as forum threads and nothing
 * else. The page is returned raw; what a caller wants out of it is the caller's problem.
 */
export function getNewsPage(
  page: number,
  { limiter, forumUrl, userAgent, cache, onEvent }: GggContext,
): Promise<string> {
  return call<string>(`${forumUrl}/view-forum/news/page/${page}`, {
    userAgent,
    limiter,
    responseType: "text",
    cache,
    onEvent,
  });
}
