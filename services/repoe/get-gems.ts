import { call, currentHour } from "./call.ts";
import type { Gems } from "./get-gems.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every gem variant in the game, from `GET /pob-data/poe1/Gems.json`.
 *
 * **Not RePoE's own export.** Everything under `/pob-data/` is Path of Building's table,
 * republished on the same GitHub Pages site. It is a static file all the same: one
 * download, no query, no way to ask for less.
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
