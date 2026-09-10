import { constants } from "node:fs";
import { access, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Lake, LakeServiceOptions } from "./types.ts";

const serialise = (value: unknown): string => `${JSON.stringify(value, undefined, 2)}\n`;

export function createLakeService({ root = ".s3" }: LakeServiceOptions = {}): Lake {
  const pathOf = (key: string) => join(root, ...key.split("/"));

  const write = async (path: string, value: unknown): Promise<void> => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, serialise(value));
  };

  return {
    async readJson<T>(key: string): Promise<T> {
      return JSON.parse(await readFile(pathOf(key), "utf8")) as T;
    },

    writeJson: (key, value) => write(pathOf(key), value),

    async writeJsonAtomic(key, value) {
      const path = pathOf(key);
      const temp = `${path}.tmp-${process.pid}`;
      await write(temp, value);
      await rename(temp, path);
    },

    async exists(key) {
      try {
        await access(pathOf(key), constants.R_OK);
        return true;
      } catch {
        return false;
      }
    },

    async list(prefix) {
      try {
        return await readdir(pathOf(prefix));
      } catch {
        return [];
      }
    },

    clear: (prefix) => rm(pathOf(prefix), { recursive: true, force: true }),
  };
}
