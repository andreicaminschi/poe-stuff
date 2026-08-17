import { requireEnv } from "../../core/env.ts";
import { fetchJson } from "../../core/http.ts";

export function extractStats(): Promise<unknown> {
  return fetchJson(requireEnv("POE_STATS_URL"));
}
