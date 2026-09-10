import { GOLD_FILES, goldKey, latestKey } from "./lake/keys.ts";
import { readManifest } from "./pipeline/manifest.ts";
import type { Lake } from "@poe/lake/types";

export async function publishCatalog(
  lake: Lake,
  runId: string,
  league: string,
): Promise<readonly string[]> {
  const manifest = await readManifest(lake, runId);

  if (manifest?.stages.gold === undefined) {
    throw new Error(`Run ${runId} has no finished gold stage. Build it first.`);
  }

  const keys: string[] = [];

  for (const file of Object.values(GOLD_FILES)) {
    const key = latestKey(league, file);
    await lake.writeJsonAtomic(key, await lake.readJson<unknown>(goldKey(runId, file)));
    keys.push(key);
  }

  return keys;
}
