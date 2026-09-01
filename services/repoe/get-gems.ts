import { call, currentHour } from "./call.ts";
import type { Gems } from "./get-gems.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every gem variant in the game, from `GET /pob-data/poe1/Gems.json`.
 *
 * **The whole file in one request, with no way to ask for less.** RePoE publishes a static
 * file per export; there is no query, no league and no partial fetch.
 *
 * What comes back is the file itself — an object keyed by the variant's metadata id, no
 * envelope around it. Transfigured variants are their own rows and share a `gameId` with
 * the gem they come from.
 */
export async function getGems(context: RepoeContext): Promise<Gems> {
  return call<Gems>(
    `${context.baseUrl}/pob-data/poe1/Gems.json`,
    currentHour(),
    context,
  );
}
