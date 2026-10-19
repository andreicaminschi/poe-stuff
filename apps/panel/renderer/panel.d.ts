import type { PanelApi } from "../contract.ts";

declare global {
  interface Window {
    readonly panel: PanelApi;
  }
}
