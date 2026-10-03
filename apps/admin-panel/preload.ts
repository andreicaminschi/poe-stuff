import { contextBridge, ipcRenderer } from "electron";
import { DISPATCH, LOAD, type PanelApi } from "./panel-api.ts";

const panel: PanelApi = {
  load: () => ipcRenderer.invoke(LOAD),
  dispatch: (command, proof) => ipcRenderer.invoke(DISPATCH, command, proof),
};

contextBridge.exposeInMainWorld("panel", panel);
