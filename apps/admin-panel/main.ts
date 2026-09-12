import { existsSync } from "node:fs";
import { join } from "node:path";
import { optionalEnv } from "@util/env";
import { app, BrowserWindow, ipcMain } from "electron";
import { repoRoot } from "./api/util/lake.ts";
import { API_NAMES } from "./api/panel-api.ts";
import { createPanelService } from "./api/panel.ts";

const envFile = join(app.getAppPath(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const service = createPanelService(
  repoRoot(app.getAppPath()),
  app.getPath("documents"),
  optionalEnv("POE_USER_AGENT"),
);

for (const name of API_NAMES) {
  const call = service[name] as (...args: unknown[]) => Promise<unknown>;
  ipcMain.handle(name, (_event, ...args: unknown[]) => call(...args));
}

function open(): void {
  const window = new BrowserWindow({
    width: 1600,
    height: 960,
    backgroundColor: "#14161a",
    title: "Taxonomy admin",
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
