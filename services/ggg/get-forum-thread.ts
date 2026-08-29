import { call } from "./call.ts";
import type { GggContext } from "./types.ts";

/**
 * Where one thread lives. The only place this path is spelled out.
 *
 * Exposed on the service because a caller that reads a thread out of a page has the id and
 * needs the address to store beside it, and building that address is this package's job.
 */
export const forumThreadUrl = (threadId: number, forumUrl: string): string =>
  `${forumUrl}/view-thread/${threadId}`;

/** One forum thread, as HTML. Same limiter as every other request to this host. */
export function getForumThread(
  threadId: number,
  { limiter, forumUrl, userAgent, cache, onEvent }: GggContext,
): Promise<string> {
  return call<string>(forumThreadUrl(threadId, forumUrl), {
    userAgent,
    limiter,
    responseType: "text",
    cache,
    onEvent,
  });
}
