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

  if (manifest.league !== league) {
    throw new Error(`Run ${runId} is for ${manifest.league}, not ${league}.`);
  }

  const files = Object.values(GOLD_FILES);
  const bodies = await Promise.all(
    files.map(async (file) => {
      const key = goldKey(runId, file);
      if (!(await lake.exists(key))) throw new Error(`Run ${runId} is missing ${key}.`);
      return lake.readJson<unknown>(key);
    }),
  );

  const keys = files.map((file) => latestKey(league, file));
  for (const [index, key] of keys.entries()) await lake.writeJsonAtomic(key, bodies[index]);

  return keys;
}
