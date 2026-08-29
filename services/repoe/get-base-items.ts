import { call, currentHour } from "./call.ts";
import type { BaseItems } from "./get-base-items.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every base item in the game, from `GET /base_items.json`.
 *
 * **The whole export in one request, with no way to ask for less.** RePoE publishes a
 * static file per export; there is no query, no league and no partial fetch. Hand the
 * service a cache or pay for the whole thing on every call.
 *
 * What comes back is the file itself — an object keyed by metadata id, no envelope around
 * it. It covers every base the client can show, including the unreleased and legacy ones,
 * which `release_state` is what separates.
 */
export async function getBaseItems(context: RepoeContext): Promise<BaseItems> {
  return call<BaseItems>(
    `${context.baseUrl}/base_items.json`,
    currentHour(),
    context,
  );
}
