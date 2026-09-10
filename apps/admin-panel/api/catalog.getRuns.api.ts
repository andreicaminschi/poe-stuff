import { CATALOG_PREFIX, manifestKey, RUN_FOLDER } from "./keys.ts";
import type { Lake } from "@poe/lake/types";

type ManifestFile = {
  readonly runId: string;
  readonly league: string;
  readonly hourId: number;
  readonly taxonomyVersion?: string;
  readonly stages: Readonly<Partial<Record<"bronze" | "silver" | "gold", unknown>>>;
};

export type RunSummary = {
  readonly id: string;
  readonly league: string;
  readonly hour: number;
  readonly taxonomyVersion?: string;
  readonly built: boolean;
};

export const toRunSummary = (manifest: ManifestFile): RunSummary => ({
  id: manifest.runId,
  league: manifest.league,
  hour: manifest.hourId,
  ...(manifest.taxonomyVersion === undefined ? {} : { taxonomyVersion: manifest.taxonomyVersion }),
  built: manifest.stages.gold !== undefined,
});

export async function getRuns(lake: Lake): Promise<readonly RunSummary[]> {
  const ids = (await lake.list(CATALOG_PREFIX)).flatMap((folder) => {
    const match = RUN_FOLDER.exec(folder);
    return match?.[1] === undefined ? [] : [match[1]];
  });

  const manifests = await Promise.all(
    ids.map(async (id) =>
      (await lake.exists(manifestKey(id))) ? [await lake.readJson<ManifestFile>(manifestKey(id))] : [],
    ),
  );

  return manifests
    .flat()
    .map(toRunSummary)
    .sort((a, b) => b.hour - a.hour);
}
