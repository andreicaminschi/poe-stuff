import { contextBridge, ipcRenderer } from "electron";
import { LOAD_VERSION, SAVE_VERSION, type PanelApi } from "./panel-api.ts";

const panel: PanelApi = {
  loadVersion: () => ipcRenderer.invoke(LOAD_VERSION),
  saveVersion: (version, categories) => ipcRenderer.invoke(SAVE_VERSION, version, categories),
};

contextBridge.exposeInMainWorld("panel", panel);
