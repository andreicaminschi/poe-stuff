import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { RAW_DIR } from "./paths.ts";

const rawPath = (name: string) => join(RAW_DIR, `${name}.json`);

/** Returns the cached extract for `name`, or undefined if it was never written. */
export async function readRaw(name: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(rawPath(name), "utf8"));
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

export async function writeRaw(name: string, value: unknown): Promise<string> {
  await mkdir(RAW_DIR, { recursive: true });
  const path = rawPath(name);
  await writeFile(path, JSON.stringify(value), "utf8");
  return path;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  );
}
