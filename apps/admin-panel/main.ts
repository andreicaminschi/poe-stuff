import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { app, BrowserWindow, ipcMain } from "electron";
import { executeCommand, type Command } from "./commands.ts";
import { loadVersion } from "./load-version.ts";
import { DISPATCH, LOAD, type LoadedVersion } from "./panel-api.ts";
import { PROOF_WINDOW_SECONDS } from "./proof-format.ts";
import { readProofJwk, thumbprintJwk, verifyProof } from "./proof.ts";
import { saveVersion } from "./save-version.ts";
import type { PanelState } from "./types.ts";

const lake = createLakeService({ root: join(app.getAppPath(), "../../.s3") });

let panel: PanelState | undefined;
let seenJtis: ReadonlyMap<string, number> = new Map();
let queue: Promise<unknown> = Promise.resolve();

/** Reads the trusted user thumbprint. The first key seen is trusted from then on. Low, Sonar 1. */
function readUserJkt(proof: string): string {
  const file = join(app.getPath("userData"), "user-key.json");

  if (existsSync(file)) return (JSON.parse(readFileSync(file, "utf8")) as { readonly jkt: string }).jkt;

  const jkt = thumbprintJwk(readProofJwk(proof));

  writeFileSync(file, JSON.stringify({ jkt }));
  return jkt;
}

/** Opens a version with nothing pending. Low, Sonar 0. */
const openVersion = (loaded: LoadedVersion): PanelState => ({ ...loaded, itemData: [], pending: [] });

/** Requires a version to be open. Low, Sonar 1. */
function requirePanel(): PanelState {
  if (panel === undefined) throw new Error("No version is open. Load one first.");
  return panel;
}

/** Runs one command against the open version, writing disk for save. Low, Sonar 1. */
async function runCommand(command: Command, actor: string): Promise<PanelState> {
  const open = requirePanel();

  if (command.type === "save") return openVersion(await saveVersion(lake, open.version, open.categories, open.pending));

  return executeCommand(open, command, { id: randomUUID(), at: new Date().toISOString(), actor });
}

/** Reads the newest version and opens it, dropping unsaved edits. Low, Sonar 0. */
async function load(): Promise<PanelState> {
  panel = openVersion(await loadVersion(lake));
  return panel;
}

/** Verifies a command's proof, runs it and keeps the result. Spends the proof's `jti`. Low, Sonar 1. */
async function dispatch(command: Command, proof: string): Promise<PanelState> {
  const now = Math.floor(Date.now() / 1000);
  const verified = verifyProof(proof, command, readUserJkt(proof), seenJtis, now);
  const live = [...seenJtis].filter(([, iat]) => now - iat <= PROOF_WINDOW_SECONDS);

  seenJtis = new Map([...live, [verified.jti, verified.iat]]);
  panel = await runCommand(command, verified.actor);
  return panel;
}

/** Runs one step after every earlier one. Low, Sonar 0. */
function enqueue(step: () => Promise<PanelState>): Promise<PanelState> {
  const result = queue.then(step);

  queue = result.catch(() => undefined);
  return result;
}

ipcMain.handle(LOAD, () => enqueue(load));
ipcMain.handle(DISPATCH, (_event, command: Command, proof: string) => enqueue(() => dispatch(command, proof)));

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
