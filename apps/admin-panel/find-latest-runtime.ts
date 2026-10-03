import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const MODEL_FILE = "fill-q8_0.gguf";

/** Finds the training version whose exported models were written last. Low, Sonar 1. */
export async function findLatestRuntime(trainingRoot: string): Promise<{ readonly version: string; readonly runtime: string }> {
  const versions = await readdir(trainingRoot);
  const dated = await Promise.all(versions.map(async (version) => {
    const runtime = join(trainingRoot, version, "output", "runtime");
    const written = await stat(join(runtime, MODEL_FILE)).then((file) => file.mtimeMs, () => -1);
    return { version, runtime, written };
  }));
  const latest = dated.filter((at) => at.written >= 0).sort((left, right) => right.written - left.written)[0];

  if (latest === undefined) throw new Error(`No trained models under ${trainingRoot}. Run apps/training/run-all.sh first.`);
  return { version: latest.version, runtime: latest.runtime };
}
