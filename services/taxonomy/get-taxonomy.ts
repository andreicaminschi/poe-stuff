import type { Lake } from "@poe/lake/types";
import { latestKey, versionKey } from "./config.ts";
import { readOrNotFound } from "./errors.ts";
import type { Taxonomy } from "./get-taxonomy.types.ts";

export async function getTaxonomy(lake: Lake, prefix: string, version?: string): Promise<Taxonomy> {
  const key = version === undefined ? latestKey(prefix) : versionKey(prefix, version);

  return readOrNotFound<Taxonomy>(lake, key);
}
