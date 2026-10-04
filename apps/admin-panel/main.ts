import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createLakeService } from "@poe/lake/service";
import { app, BrowserWindow, ipcMain } from "electron";
import { executeCommand, type Command } from "./commands.ts";
import type { DecisionOption } from "./decision-options.ts";
import { listRuntimes, runtimeOf } from "./list-runtimes.ts";
import { findNames, listKnownNames } from "./find-names.ts";
import { CONDITION_FORMATS } from "./condition-values.ts";
import { loadVersion } from "./load-version.ts";
import { DISPATCH, FEEDBACK, LOAD, MODELS, PLAN, type AgentPlan, type FeedbackRecord, type LoadedVersion } from "./panel-api.ts";
import { runAgent, type AgentModels } from "./run-agent.ts";
import { loadDecide } from "./run-agent/load-decide.ts";
import { loadFill } from "./run-agent/load-fill.ts";
import { saveVersion } from "./save-version.ts";
import type { PanelState } from "./types.ts";

const lake = createLakeService({ root: join(app.getAppPath(), "../../.s3") });
const ACTOR = "user";

let panel: PanelState | undefined;
let queue: Promise<unknown> = Promise.resolve();
const TRAINING_ROOT = join(app.getAppPath(), "../../.s3/training");
let agent: { readonly name: string; readonly loaded: Promise<{ readonly models: AgentModels; readonly model: string }> } | undefined;

/** Opens a version with nothing pending. Low, Sonar 0. */
const openVersion = (loaded: LoadedVersion): PanelState => ({ ...loaded, itemData: [], pending: [] });

/** Requires a version to be open. Low, Sonar 1. */
function requirePanel(): PanelState {
  if (panel === undefined) throw new Error("No version is open. Load one first.");
  return panel;
}

/** Runs one command against the open version, writing disk for save. Low, Sonar 1. */
async function runCommand(command: Command): Promise<PanelState> {
  const open = requirePanel();

  if (command.type === "save") return openVersion(await saveVersion(lake, open.version, open.categories, open.pending));

  return executeCommand(open, command, { id: randomUUID(), at: new Date().toISOString(), actor: ACTOR });
}

/** Reads the newest version and opens it, dropping unsaved edits. Low, Sonar 0. */
async function load(): Promise<PanelState> {
  panel = openVersion(await loadVersion(lake));
  return panel;
}

/** Runs a command and keeps the result. Low, Sonar 0. */
async function dispatch(command: Command): Promise<PanelState> {
  panel = await runCommand(command);
  return panel;
}

/** Runs one step after every earlier one. Low, Sonar 0. */
function enqueue<T>(step: () => Promise<T>): Promise<T> {
  const result = queue.then(step);

  queue = result.catch(() => undefined);
  return result;
}

/** Loads one trained version's models on the GPU: DirectML for decisions, CUDA for fills. Low, Sonar 0. */
async function loadAgent(name: string): Promise<{ readonly models: AgentModels; readonly model: string }> {
  const runtime = runtimeOf(TRAINING_ROOT, name);
  const commands = await lake.readJson<readonly DecisionOption[]>(`training/${name}/training-data/commands.json`);

  return {
    models: { scoreYes: await loadDecide(runtime, true, "fp32"), fillParams: await loadFill(runtime, true), commands },
    model: name,
  };
}

/** Keeps one model loaded: the one asked for, or the newest when none is named. Low, Sonar 2. */
async function useAgent(name: string): Promise<{ readonly models: AgentModels; readonly model: string }> {
  const wanted = name === ""
    ? (await listRuntimes(TRAINING_ROOT))[0]?.name
    : name;
  if (wanted === undefined) throw new Error("No trained models under .s3/training. Run yarn agent:train first.");
  if (agent?.name !== wanted) agent = { name: wanted, loaded: loadAgent(wanted) };
  return agent.loaded;
}

/** Asks the agent for a plan on a copy of the open state. The open state never changes. Low, Sonar 1. */
async function plan(query: string, model: string): Promise<AgentPlan> {
  const { models, model: used } = await useAgent(model);
  const open = requirePanel();
  const names = findNames([...listKnownNames(open), ...CONDITION_FORMATS.map((condition) => condition.key)], query);
  const started = performance.now();
  const run = await runAgent(models, open, query, names, { id: "plan", at: new Date().toISOString(), actor: "agent" });
  const failed = run.outcome === "invalid json" || run.outcome === "command failed"
    ? run.turns.at(-1)
    : undefined;

  return {
    query,
    names,
    start: { categories: open.categories, itemData: open.itemData },
    steps: run.commands,
    failedStep: failed === undefined
      ? undefined
      : { type: failed.command, answer: failed.answer },
    outcome: run.outcome,
    model: used,
    ms: Math.round(performance.now() - started),
  };
}

/** Keeps one interaction as one file. Low, Sonar 0. */
const saveFeedback = (record: FeedbackRecord): Promise<void> =>
  lake.writeJson(`admin-panel/agent-feedback/${record.at.replaceAll(":", "-")}-${record.id}.json`, record);

ipcMain.handle(LOAD, () => enqueue(load));
ipcMain.handle(DISPATCH, (_event, command: Command) => enqueue(() => dispatch(command)));
ipcMain.handle(MODELS, () => listRuntimes(TRAINING_ROOT));
ipcMain.handle(PLAN, (_event, query: string, model: string) => enqueue(() => plan(query, model)));
ipcMain.handle(FEEDBACK, (_event, record: FeedbackRecord) => saveFeedback(record));

function open(): void {
  const window = new BrowserWindow({
    width: 1600,
    height: 960,
    backgroundColor: "#14161a",
    title: "Admin panel",
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.maximize();

  const devUrl = process.env.ELECTRON_RENDERER_URL;

  if (devUrl === undefined) void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
  else void window.loadURL(devUrl);
}

void app.whenReady().then(open);
app.on("window-all-closed", () => app.quit());
