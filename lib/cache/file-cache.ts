import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * A store of JSON values under string keys. Deliberately narrower than the caches that
 * use it — it knows nothing about what `T` is, which is what lets one implementation
 * back both an HTTP response cache and a league digest.
 */
export type FileCache<T> = {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
};

function filePath(root: string, key: string): string {
  if (key.length === 0 || key === "." || key === ".." || /[\\/\0]/.test(key)) {
    throw new Error(`cache key "${key}" is not a single file name`);
  }
  return join(root, `${key}.json`);
}

/**
 * Values on disk, one file per key. A cache that exists to make a run repeatable on one
 * laptop has no reason to be anywhere else, and a folder can be read, grepped and
 * deleted without a client.
 *
 * A write that fails throws rather than being swallowed: this runs where someone is
 * watching, and a cache that quietly stores nothing looks exactly like one that works.
 */
export function fileCache<T>(root: string): FileCache<T> {
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(filePath(root, key), "utf8")) as T;
      } catch (error) {
        // A missing file is a miss. Everything else is a real error.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
    },

    async set(key, value) {
      const path = filePath(root, key);
      if (value === undefined) throw new Error(`cache value for "${key}" is undefined, which JSON cannot hold`);

      // Rename is atomic: readers never see half a file.
      const temp = `${path}.tmp-${process.pid}-${randomUUID()}`;
      await mkdir(dirname(path), { recursive: true });
      await writeFile(temp, JSON.stringify(value), "utf8");
      await rename(temp, path);
    },
  };
}
