import { call, currentHour } from "./call.ts";
import type { Mods } from "./get-mods.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every mod in the game, from `GET /mods.json`.
 *
 * **The whole export in one request, with no way to ask for less.** It is the largest file
 * RePoE publishes. Hand the service a cache or pay for the whole thing on every call.
 *
 * Not the `.min` variant, for the same reason as `getBaseItems`.
 */
export async function getMods(context: RepoeContext): Promise<Mods> {
  return call<Mods>(`${context.baseUrl}/mods.json`, currentHour(), context);
}
