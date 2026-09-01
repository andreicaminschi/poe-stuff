import { call, currentHour } from "./call.ts";
import type { Essences } from "./get-essences.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every essence, from `GET /pob-data/poe1/Essence.min.json`.
 *
 * **The whole file in one request, with no way to ask for less.** RePoE publishes a static
 * file per export; there is no query, no league and no partial fetch. The `.min` variant is
 * the same export with the whitespace taken out, and parses to exactly the same object.
 *
 * What comes back is the file itself — an object keyed by the essence's currency metadata
 * id, no envelope around it. The name is the singular `Essence`, unlike the other two.
 */
export async function getEssences(context: RepoeContext): Promise<Essences> {
  return call<Essences>(
    `${context.baseUrl}/pob-data/poe1/Essence.min.json`,
    currentHour(),
    context,
  );
}
