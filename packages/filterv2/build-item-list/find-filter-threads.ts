import type { ThreadLink } from "../types.ts";

const LINK = /<a href="\/forum\/view-thread\/(\d+)"[^>]*>([^<]{4,200})<\/a>/gu;
const TITLE = /Item Filter Information/iu;

const tidy = (text: string) =>
  text
    .replace(/&#039;/gu, "'")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();

/**
 * The Item Filter Information threads linked from one news page, in page order.
 *
 * Ids and titles only. Where a thread lives is `@poe/ggg`'s to say, and the caller holds
 * the service that says it.
 */
export function findFilterThreads(html: string): ThreadLink[] {
  const found: ThreadLink[] = [];

  for (const match of html.matchAll(LINK)) {
    const title = tidy(match[2] ?? "");
    if (!TITLE.test(title)) continue;

    found.push({ threadId: Number(match[1]), title });
  }

  return found;
}
