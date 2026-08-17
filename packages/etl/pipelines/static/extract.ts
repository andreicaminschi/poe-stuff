import { requireEnv } from "../../core/env.ts";
import { fetchJson } from "../../core/http.ts";

export function extractStatic(): Promise<unknown> {
  return fetchJson(requireEnv("POE_STATIC_URL"));
}
