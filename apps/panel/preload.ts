import { contextBridge, ipcRenderer } from "electron";
import type { PanelApi } from "./contract.ts";
import { CHANNEL_NAMES } from "./contract/channels.ts";

const api = Object.fromEntries(CHANNEL_NAMES.map((channel) => [channel, (...args: unknown[]) => ipcRenderer.invoke(channel, ...args)])) as PanelApi;

contextBridge.exposeInMainWorld("panel", api);
