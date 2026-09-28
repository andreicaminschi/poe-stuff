import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** A store of JSON values under string keys. */
export type FileCache<T> = {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
};

/** Turns a cache key into its file path, refusing a key that isn't a single file name. */
function resolveCacheFilePath(root: string, key: string): string {
  if (key.length === 0 || key === "." || key === ".." || /[\\/\0]/.test(key)) {
    throw new Error(`cache key "${key}" is not a single file name`);
  }
  return join(root, `${key}.json`);
}

/** Stores JSON values on disk, one file per key, as the response cache every service uses. */
export function createFileCache<T>(root: string): FileCache<T> {
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(resolveCacheFilePath(root, key), "utf8")) as T;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
    },

    async set(key, value) {
      const path = resolveCacheFilePath(root, key);
      if (value === undefined) throw new Error(`cache value for "${key}" is undefined, which JSON cannot hold`);

      const temp = `${path}.tmp-${process.pid}-${randomUUID()}`; // rename is atomic
      await mkdir(dirname(path), { recursive: true });
      await writeFile(temp, JSON.stringify(value), "utf8");
      await rename(temp, path);
    },
  };
}
