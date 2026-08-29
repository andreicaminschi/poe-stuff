import { createHash } from "node:crypto";
import type { GGGService } from "@poe/ggg/service";
import { findFilterThreads } from "./find-filter-threads.ts";
import { firstPostLines } from "./first-post-lines.ts";
import { processedPostFiles } from "./processed-post-files.ts";
import { processPost } from "./process-post.ts";
import type { ForumPost, ProcessedPost, ThreadLink } from "../types.ts";

const MAX_PAGES = 5;
const A_DAY_MS = 24 * 60 * 60 * 1000;

/** Over the extracted text, not the HTML: a re-rendered page is not an edited post. */
const checksumOf = (lines: readonly string[]): string =>
  createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");

export type SyncOptions = {
  readonly ggg: GGGService;
  readonly dir: string;
  readonly model: string;
  readonly force: boolean;
  readonly log: (line: string) => void;
};

/**
 * The newest Item Filter Information thread on the news forum.
 *
 * News pages run newest first and so do the links inside one, so the first match is the
 * newest thread there is. A later page is reached only when no such thread appears on the
 * pages before it.
 */
async function findNewestThread(
  options: SyncOptions,
): Promise<ThreadLink | null> {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const [newest] = findFilterThreads(await options.ggg.getNewsPage(page));
    if (newest !== undefined) return newest;
  }

  return null;
}

/**
 * The newest Item Filter Information post, processed.
 *
 * **Only the newest thread is ever read.** Every consumer asks the same two questions —
 * what did this league rename, and what did it add — and only the newest post answers
 * them. An older post costs a `claude -p` call to produce an answer nothing looks at, so
 * the walk stops at the first thread it finds instead of processing every one it passes.
 *
 * The model is asked only when the text is one it has not answered for. GGG edits these
 * posts in place, so the thread id cannot decide that — the stored answer carries a
 * checksum of the text it was read from, and a search compares it against what it just
 * fetched. Same text, stored answer. Different text, one model call.
 *
 * The search itself runs at most once a day. A new league is a new post, and a post does
 * not appear twice in an afternoon — the rest of the time the stored result is the answer
 * and GGG hears nothing from us. Pacing is the service's: the forum is the same host and
 * the same per-IP budget as the trade API.
 */
export async function syncForumPosts(
  options: SyncOptions,
): Promise<ProcessedPost | null> {
  const files = processedPostFiles(options.dir);
  const index = await files.readIndex();
  const stored = index.posts[0];

  const searchedAt =
    index.lastSearchedAt === null ? 0 : Date.parse(index.lastSearchedAt);

  if (Date.now() - searchedAt < A_DAY_MS && !options.force) {
    options.log(`forum: searched ${index.lastSearchedAt}, using stored posts`);
    return stored === undefined ? null : files.readPost(stored.threadId);
  }

  const newest = await findNewestThread(options);
  const searched = new Date().toISOString();

  if (newest === null) {
    options.log("forum: no Item Filter Information thread on these pages");
    await files.writeIndex({ lastSearchedAt: searched, posts: index.posts });
    return stored === undefined ? null : files.readPost(stored.threadId);
  }

  const post: ForumPost = {
    ...newest,
    url: options.ggg.forumThreadUrl(newest.threadId),
  };

  const lines = firstPostLines(
    await options.ggg.getForumThread(post.threadId),
  );
  const textChecksum = checksumOf(lines);
  const known = await files.readPost(post.threadId);

  const posts = [post, ...index.posts.filter((p) => p.threadId !== post.threadId)]
    .sort((a, b) => b.threadId - a.threadId);

  if (known?.textChecksum === textChecksum) {
    options.log(`forum: unchanged since it was read — ${post.title}`);
    await files.writeIndex({ lastSearchedAt: searched, posts });
    return known;
  }

  options.log(
    known === null
      ? `forum: processing ${post.title}`
      : `forum: edited since it was read, processing again — ${post.title}`,
  );

  const processed = await processPost({
    post,
    lines,
    textChecksum,
    model: options.model,
  });

  await files.writePost(processed);
  await files.writeIndex({ lastSearchedAt: searched, posts });

  return processed;
}
