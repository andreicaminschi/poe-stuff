import type { GeneratorApi } from "../api/generator-api.ts";

declare global {
  interface Window {
    readonly generator: GeneratorApi;
  }
}
