import type { Lake } from "@poe/lake/types";

/** The JSON at `key`, or `fallback` when nothing is there yet. */
export const readOr = async <T>(lake: Lake, key: string, fallback: T): Promise<T> =>
  (await lake.exists(key)) ? lake.readJson<T>(key) : fallback;
