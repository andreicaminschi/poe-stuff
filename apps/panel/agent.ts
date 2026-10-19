import { join } from "node:path";
import { VOCABULARY } from "@poe/agent-input/vocabulary";
import type { PanelState } from "@poe/panel-state/types";
import type { ModelRun } from "./contract.ts";
import { listRuns } from "./agent/list-runs.ts";
import { loadClassifier } from "./agent/load-classifier.ts";
import { loadFiller, type LoadedFiller } from "./agent/load-filler.ts";
import { runSteps, type Models, type StepsResult } from "./agent/run-steps.ts";
import { describeError, type Logger } from "./logger.ts";

type Loaded = { readonly run: string; readonly models: Models; readonly release: () => Promise<void> };

export type Agent = {
  readonly listModels: () => Promise<readonly ModelRun[]>;
  readonly plan: (state: PanelState, request: string, run: string) => Promise<StepsResult>;
  readonly release: () => Promise<void>;
};

// measured: Vulkan ≈4× CPU
async function loadFillerWithFallback(exportDir: string, logger: Logger): Promise<LoadedFiller> {
  try {
    return await loadFiller(exportDir, "q8_0", "vulkan", VOCABULARY);
  } catch (error) {
    logger.log("warn", "filler.vulkan-failed", { error: describeError(error) });
    return loadFiller(exportDir, "q8_0", false, VOCABULARY);
  }
}

/** Router and Judge as fp32 ONNX on the CPU, the Filler as q8_0 GGUF on Vulkan. */
async function loadModels(runsDir: string, run: string, logger: Logger): Promise<Loaded> {
  const exportDir = join(runsDir, run, "export");
  const started = performance.now();
  const [router, judge, filler] = await Promise.all([
    loadClassifier(exportDir, "router", "fp32"),
    loadClassifier(exportDir, "judge", "fp32"),
    loadFillerWithFallback(exportDir, logger),
  ]);

  logger.log("info", "agent.loaded", { run, ms: Math.round(performance.now() - started) });
  return {
    run,
    models: { route: router.classify, fill: filler.fillParams, judge: judge.classify },
    release: async () => {
      await Promise.all([router.release(), judge.release(), filler.release()]);
    },
  };
}

/** Keeps one run's models loaded at a time; asking for another releases the old one first. */
export function createAgent(runsDir: string, logger: Logger): Agent {
  let loaded: Promise<Loaded> | undefined;
  let loadedRun: string | undefined;

  async function use(run: string): Promise<Models> {
    const runs = await listRuns(runsDir);
    if (!runs.some((entry) => entry.run === run)) throw new Error(`No exported run "${run}" under ${runsDir}.`);
    if (loadedRun !== run || loaded === undefined) {
      const previous = loaded;
      loadedRun = run;
      loaded = (async () => {
        await previous?.then((models) => models.release()).catch(() => undefined);
        return loadModels(runsDir, run, logger);
      })();
      // a failed load is retried next time
      loaded.catch(() => {
        loaded = undefined;
        loadedRun = undefined;
      });
    }
    return (await loaded).models;
  }

  return {
    listModels: () => listRuns(runsDir),
    plan: async (state, request, run) => runSteps(await use(run), state, request),
    release: async () => {
      await loaded?.then((models) => models.release()).catch(() => undefined);
      loaded = undefined;
      loadedRun = undefined;
    },
  };
}
