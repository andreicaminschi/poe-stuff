import { call, currentHour } from "./call.ts";
import type { FoulbornMap } from "./get-foulborn-map.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every unique that can drop foulborn and the mods it can roll, from
 * `GET /pob-data/poe1/ModFoulbornMap.json`.
 *
 * **The whole file in one request, with no way to ask for less**, like every other export
 * here. Small — a few hundred names — and with no `.min` variant.
 *
 * What comes back is the file itself: an object keyed by the unique's display name, no
 * envelope around it. Keyed by name and not by metadata id, because Path of Building has
 * no id for a unique either.
 */
export async function getFoulbornMap(context: RepoeContext): Promise<FoulbornMap> {
  return call<FoulbornMap>(
    `${context.baseUrl}/pob-data/poe1/ModFoulbornMap.json`,
    currentHour(),
    context,
  );
}
