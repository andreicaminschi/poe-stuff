import type { PanelApi } from "../panel-api.ts";

declare global {
  interface Window {
    readonly panel: PanelApi;
  }
}
