import type { PanelApi } from "../api/panel-api.ts";

declare global {
  interface Window {
    readonly panel: PanelApi;
  }
}
