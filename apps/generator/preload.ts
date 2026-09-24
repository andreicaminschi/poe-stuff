import { contextBridge, ipcRenderer } from "electron";
import { API_NAMES, type GeneratorApi } from "./api/generator-api.ts";

const generator = Object.fromEntries(
  API_NAMES.map((name) => [name, (...args: unknown[]) => ipcRenderer.invoke(name, ...args)]),
) as GeneratorApi;

contextBridge.exposeInMainWorld("generator", generator);
