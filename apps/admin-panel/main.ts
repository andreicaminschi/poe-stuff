import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { app, BrowserWindow, ipcMain } from "electron";
import { loadVersion } from "./load-version.ts";
import { LOAD_VERSION, SAVE_VERSION } from "./panel-api.ts";
import { saveVersion } from "./save-version.ts";
import type { Category, WalEntry } from "./types.ts";

const lake = createLakeService({ root: join(app.getAppPath(), "../../.s3") });

ipcMain.handle(LOAD_VERSION, () => loadVersion(lake));
ipcMain.handle(SAVE_VERSION, (_event, version: string, categories: readonly Category[], entries: readonly WalEntry[]) =>
  saveVersion(lake, version, categories, entries));

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
