import { contextBridge, ipcRenderer } from "electron";
import { DISPATCH, FEEDBACK, LOAD, PLAN, type PanelApi } from "./panel-api.ts";

const panel: PanelApi = {
  load: () => ipcRenderer.invoke(LOAD),
  dispatch: (command) => ipcRenderer.invoke(DISPATCH, command),
  plan: (query) => ipcRenderer.invoke(PLAN, query),
  feedback: (record) => ipcRenderer.invoke(FEEDBACK, record),
};

contextBridge.exposeInMainWorld("panel", panel);
