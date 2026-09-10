import { contextBridge, ipcRenderer } from "electron";
import { API_NAMES, type PanelApi } from "./api/panel-api.ts";

const panel = Object.fromEntries(
  API_NAMES.map((name) => [name, (...args: unknown[]) => ipcRenderer.invoke(name, ...args)]),
) as PanelApi;

contextBridge.exposeInMainWorld("panel", panel);
