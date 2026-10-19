import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// workspace libs ship .ts, so bundle them
const WORKSPACE = ["@poe/agent-input", "@poe/filter-eval", "@poe/lake", "@poe/panel-state", "@util/diff-summary"];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE })],
    build: { lib: { entry: "main.ts" } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: "preload.ts" },
      rollupOptions: { output: { format: "cjs", entryFileNames: "[name].cjs" } },
    },
  },
  renderer: {
    root: "renderer",
    plugins: [react()],
    build: { rollupOptions: { input: "renderer/index.html" } },
  },
});
