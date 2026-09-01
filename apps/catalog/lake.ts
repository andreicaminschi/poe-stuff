import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Lake } from "./types.ts";

/** Where the lake lives when it is a folder rather than a bucket. */
export const DEFAULT_ROOT = ".s3";

/**
 * The lake as local files.
 *
 * A key is a `/`-joined string either way, so the same string addresses a file here and an
 * object in a bucket — `join` is the only difference, and it is what makes the keys work on
 * Windows without anything else in the app knowing about separators.
 *
 * **Indented on purpose.** This implementation exists to be read in an editor while a run is
 * going; the bucket implementation, when there is one, should write the compact form.
 */
export function createLocalLake(root: string = DEFAULT_ROOT): Lake {
  const pathOf = (key: string) => join(root, ...key.split("/"));

  return {
    async readJson<T>(key: string): Promise<T> {
      return JSON.parse(await readFile(pathOf(key), "utf8")) as T;
    },

    async writeJson(key: string, value: unknown): Promise<void> {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(value, undefined, 2)}\n`);
    },

    async exists(key: string): Promise<boolean> {
      try {
        await access(pathOf(key), constants.R_OK);
        return true;
      } catch {
        return false;
      }
    },
  };
}
