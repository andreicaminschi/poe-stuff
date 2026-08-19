import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CachedResponse, ResponseCache } from "@poe/ggg/types";
import { optionalEnv } from "@util/core/env";

/**
 * `cacheKey` hands back `namespace:digest`. The colon becomes a directory — Windows will
 * not have it in a filename anyway — so a listing groups by what wrote the entry.
 */
const filePath = (root: string, key: string) =>
  join(root, `${key.replace(":", "/")}.json`);

/**
 * Responses on disk, one file per request. A cache that exists to make a run repeatable
 * on one laptop has no reason to be anywhere else, and a folder can be read, grepped and
 * deleted without a client.
 *
 * A write that fails throws rather than being swallowed: this runs where someone is
 * watching, and a cache that quietly stores nothing looks exactly like one that works.
 */
export function fileCache(root: string): ResponseCache {
  return {
    async get(key) {
      try {
        return JSON.parse(
          await readFile(filePath(root, key), "utf8"),
        ) as CachedResponse;
      } catch (error) {
        // A missing file is a miss. Everything else is a real error.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
    },

    async set(key, value) {
      const path = filePath(root, key);

      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(value), "utf8");
    },
  };
}

/**
 * The cache a worker runs with. `CACHE_DIR` naming a folder is the whole switch — unset
 * means every request goes to GGG, which is what production wants.
 */
export function cacheFromEnv(): ResponseCache | undefined {
  const root = optionalEnv("CACHE_DIR");

  return root === undefined ? undefined : fileCache(root);
}
