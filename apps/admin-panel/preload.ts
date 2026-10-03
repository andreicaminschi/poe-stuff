import { contextBridge, ipcRenderer } from "electron";
import { DISPATCH, FEEDBACK, LOAD, MODELS, PLAN, type PanelApi } from "./panel-api.ts";

const panel: PanelApi = {
  load: () => ipcRenderer.invoke(LOAD),
  dispatch: (command) => ipcRenderer.invoke(DISPATCH, command),
  models: () => ipcRenderer.invoke(MODELS),
  plan: (query, model) => ipcRenderer.invoke(PLAN, query, model),
  feedback: (record) => ipcRenderer.invoke(FEEDBACK, record),
};

contextBridge.exposeInMainWorld("panel", panel);
