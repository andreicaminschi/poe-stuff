import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { app, BrowserWindow, ipcMain } from "electron";
import type { z } from "zod";
import { createAgent } from "./agent.ts";
import { CHANNELS, type Channel, type Outputs, type Result } from "./contract.ts";
import { createDispatcher } from "./dispatcher.ts";
import { createLogger, describeError } from "./logger.ts";
import { APP_ORIGIN, lockDown, registerAppScheme, requireTrustedSender, serveRenderer } from "./security.ts";
import { createVersionStore } from "./version-store.ts";

const S3_ROOT = join(app.getAppPath(), "../../.s3");
const DEV_ORIGIN = process.env.ELECTRON_RENDERER_URL === undefined
  ? undefined
  : new URL(process.env.ELECTRON_RENDERER_URL).origin;

type Handlers = { readonly [K in Channel]: (...args: z.output<(typeof CHANNELS)[K]["input"]>) => Promise<Outputs[K]> };

const logger = createLogger(join(S3_ROOT, "panel", "logs"));
const lake = createLakeService({ root: S3_ROOT });
const agent = createAgent(join(S3_ROOT, "agent-training", "runs"), logger);
const dispatcher = createDispatcher(createVersionStore(lake), agent, lake, logger);

const HANDLERS: Handlers = {
  "panel:view": () => dispatcher.view(),
  "panel:versions": () => dispatcher.versions(),
  "panel:open": (version) => dispatcher.open(version),
  "panel:dispatch": (command) => dispatcher.dispatch(command),
  "panel:undo": () => dispatcher.undo(),
  "panel:save": () => dispatcher.save(),
  "agent:models": () => dispatcher.listModels(),
  "agent:plan": (request, run) => dispatcher.plan(request, run),
  "agent:approve": (id, steps, notes) => dispatcher.approve(id, steps, notes),
  "agent:reject": (id, notes) => dispatcher.reject(id, notes),
  "agent:dismiss": (id) => dispatcher.dismiss(id),
};

const readMessage = (error: unknown): string => (error instanceof Error
  ? error.message
  : String(error));

/** Validates a channel's arguments, runs its handler, and answers with a result instead of throwing. */
function register<K extends Channel>(channel: K): void {
  const handler = HANDLERS[channel] as (...args: readonly unknown[]) => Promise<Outputs[K]>;

  ipcMain.handle(channel, async (event, ...raw: unknown[]): Promise<Result<Outputs[K]>> => {
    const started = performance.now();
    try {
      requireTrustedSender(event, DEV_ORIGIN);
      const parsed = CHANNELS[channel].input.safeParse(raw);
      if (!parsed.success) {
        logger.log("warn", "ipc.invalid", { channel, issues: parsed.error.issues });
        return { ok: false, error: `Invalid ${channel} request: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` };
      }
      const value = await handler(...(parsed.data as readonly unknown[]));
      logger.log("info", "ipc.ok", { channel, ms: Math.round(performance.now() - started) });
      return { ok: true, value };
    } catch (error) {
      logger.log("error", "ipc.failed", { channel, ms: Math.round(performance.now() - started), error: describeError(error) });
      return { ok: false, error: readMessage(error) };
    }
  });
}

function openWindow(): void {
  const window = new BrowserWindow({
    width: 1600,
    height: 960,
    show: false,
    backgroundColor: "#14161a",
    title: "Panel",
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  window.once("ready-to-show", () => {
    window.maximize();
    window.show();
  });
  void window.loadURL(DEV_ORIGIN === undefined
    ? `${APP_ORIGIN}/index.html`
    : (process.env.ELECTRON_RENDERER_URL ?? ""));
}

registerAppScheme();
app.enableSandbox();

void app.whenReady().then(() => {
  lockDown(DEV_ORIGIN);
  serveRenderer(join(import.meta.dirname, "../renderer"));
  for (const channel of Object.keys(CHANNELS) as Channel[]) register(channel);
  logger.log("info", "app.ready", { s3: S3_ROOT, dev: DEV_ORIGIN !== undefined });
  openWindow();
});

app.on("window-all-closed", () => app.quit());
app.on("will-quit", (event) => {
  event.preventDefault();
  void Promise.allSettled([agent.release(), logger.flush()]).finally(() => app.exit(0));
});
