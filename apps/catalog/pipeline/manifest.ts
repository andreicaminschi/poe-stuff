import { manifestKey } from "../lake/keys.ts";
import type { Lake, Manifest, Stage, StageRecord } from "../types.ts";

/** The run's manifest, or nothing when the run has never finished a stage. */
export async function readManifest(
  lake: Lake,
  runId: string,
): Promise<Manifest | undefined> {
  const key = manifestKey(runId);
  return (await lake.exists(key)) ? lake.readJson<Manifest>(key) : undefined;
}

/**
 * The same manifest with one more stage recorded.
 *
 * Returns a new manifest rather than writing into the one it was handed, so a stage cannot
 * quietly amend what an earlier one reported.
 */
export const withStage = (
  manifest: Manifest,
  stage: Stage,
  record: StageRecord,
): Manifest => ({
  ...manifest,
  stages: { ...manifest.stages, [stage]: record },
});

export const writeManifest = (lake: Lake, manifest: Manifest): Promise<void> =>
  lake.writeJson(manifestKey(manifest.runId), manifest);
