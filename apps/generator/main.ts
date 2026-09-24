import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { API_NAMES } from "./api/generator-api.ts";
import { createGeneratorService } from "./api/generator.ts";
import { repoRoot } from "./api/util/lake.ts";

let window: BrowserWindow | undefined;

async function choosePath(): Promise<string | undefined> {
  const options = {
    title: "Write the filter",
    defaultPath: join(app.getPath("documents"), "My Games", "Path of Exile", "poe-stuff.filter"),
    filters: [{ name: "Item filter", extensions: ["filter"] }],
  };
  const result = window === undefined ? await dialog.showSaveDialog(options) : await dialog.showSaveDialog(window, options);

  return result.canceled ? undefined : result.filePath;
}

const service = createGeneratorService(repoRoot(app.getAppPath()), choosePath);

for (const name of API_NAMES) {
  const call = service[name] as (...args: unknown[]) => Promise<unknown>;
  ipcMain.handle(name, (_event, ...args: unknown[]) => call(...args));
}

function open(): void {
  window = new BrowserWindow({
    width: 1600,
    height: 960,
    backgroundColor: "#14161a",
    title: "Filter generator",
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
