import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PostIndex, ProcessedPost } from "../types.ts";

const EMPTY: PostIndex = { lastSearchedAt: null, posts: [] };

const read = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
};

const write = async (path: string, value: unknown): Promise<void> => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

/**
 * Where processed posts live: one file per thread, plus the index that says when the
 * forum was last walked. A stored result is what tells a later walk it has reached
 * familiar ground, so nothing here is ever recomputed.
 */
export function processedPostFiles(dir: string) {
  const indexPath = join(dir, "index.json");
  const postPath = (threadId: number) => join(dir, `${threadId}.json`);

  return {
    readIndex: () => read(indexPath, EMPTY),

    async writeIndex(index: PostIndex): Promise<void> {
      await mkdir(dir, { recursive: true });
      await write(indexPath, index);
    },

    readPost: (threadId: number) =>
      read<ProcessedPost | null>(postPath(threadId), null),

    async writePost(processed: ProcessedPost): Promise<void> {
      await mkdir(dir, { recursive: true });
      await write(postPath(processed.post.threadId), processed);
    },
  };
}
