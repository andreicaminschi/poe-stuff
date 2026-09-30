import { contextBridge, ipcRenderer } from "electron";
import { LOAD_VERSION, SAVE_VERSION, type PanelApi } from "./panel-api.ts";

const panel: PanelApi = {
  loadVersion: () => ipcRenderer.invoke(LOAD_VERSION),
  saveVersion: (version, categories, entries) => ipcRenderer.invoke(SAVE_VERSION, version, categories, entries),
};

contextBridge.exposeInMainWorld("panel", panel);
