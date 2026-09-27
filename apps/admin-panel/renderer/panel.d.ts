import type { PanelApi, PanelEvents } from "../api/panel-api.ts";

declare global {
  interface Window {
    readonly panel: PanelApi & PanelEvents;
  }
}
