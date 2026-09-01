import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Lake } from "./types.ts";

/** Where the lake lives when it is a folder rather than a bucket. */
export const DEFAULT_ROOT = ".s3";

/** Prefix every published version sits under. Agreed with the reader by layout, not code. */
export const PREFIX = "taxonomy";

export const versionKey = (version: string): string =>
  `${PREFIX}/${version}.json`;

export const pointerKey = (): string => `${PREFIX}/latest.json`;

/**
 * This app's lake, and only this app's.
 *
 * `apps/catalog` has one of its own that looks much the same, and that repetition is
 * deliberate: an app is never imported by another, so sharing one would mean promoting it
 * to a package that both depend on — and then a change made for the writer would land in
 * the reader without anyone choosing it.
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
