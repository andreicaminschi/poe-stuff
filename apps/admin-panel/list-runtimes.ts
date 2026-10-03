import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { TrainedModel } from "./panel-api.ts";

const MODEL_FILE = "fill-q8_0.gguf";

/** Lists every training version with exported models, newest first. Low, Sonar 1. */
export async function listRuntimes(trainingRoot: string): Promise<readonly TrainedModel[]> {
  const versions = await readdir(trainingRoot).catch(() => []);
  const dated = await Promise.all(versions.map(async (name) => {
    const written = await stat(join(trainingRoot, name, "output", "runtime", MODEL_FILE)).then((file) => file.mtimeMs, () => -1);
    return { name, trainedAt: written >= 0 ? new Date(written).toISOString() : "" };
  }));

  return dated.filter((model) => model.trainedAt !== "").sort((left, right) => right.trainedAt.localeCompare(left.trainedAt));
}

export const runtimeOf = (trainingRoot: string, name: string): string => join(trainingRoot, name, "output", "runtime");
