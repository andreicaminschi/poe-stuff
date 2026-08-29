import { call } from "./call.ts";
import type { GggContext } from "./types.ts";

/** One forum thread, as HTML. Same limiter as every other request to this host. */
export function getForumThread(
  threadId: number,
  { limiter, forumUrl, userAgent, cache, onEvent }: GggContext,
): Promise<string> {
  return call<string>(`${forumUrl}/view-thread/${threadId}`, {
    userAgent,
    limiter,
    responseType: "text",
    cache,
    onEvent,
  });
}
