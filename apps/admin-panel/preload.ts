import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { API_NAMES, PROGRESS_CHANNEL, type PanelApi, type PanelEvents, type ValidateProgress } from "./api/panel-api.ts";

const calls = Object.fromEntries(
  API_NAMES.map((name) => [name, (...args: unknown[]) => ipcRenderer.invoke(name, ...args)]),
) as PanelApi;

const events: PanelEvents = {
  onProgress: (listener) => {
    const handler = (_event: IpcRendererEvent, progress: ValidateProgress) => listener(progress);
    ipcRenderer.on(PROGRESS_CHANNEL, handler);
    return () => ipcRenderer.off(PROGRESS_CHANNEL, handler);
  },
};

contextBridge.exposeInMainWorld("panel", { ...calls, ...events });
