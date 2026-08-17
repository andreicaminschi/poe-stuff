import { requireEnv } from "../../core/env.ts";
import { fetchJson } from "../../core/http.ts";

export function extractLeagues(): Promise<unknown> {
  return fetchJson(requireEnv("POE_LEAGUES_URL"));
}
