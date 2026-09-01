import { call, currentHour } from "./call.ts";
import type { Essences } from "./get-essences.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every essence, from `GET /pob-data/poe1/Essence.json`.
 *
 * **Not RePoE's own export.** Everything under `/pob-data/` is Path of Building's table,
 * republished on the same GitHub Pages site. It is a static file all the same: one
 * download, no query, no way to ask for less.
 *
 * What comes back is the file itself — an object keyed by the essence's currency metadata
 * id, no envelope around it. The file is the singular `Essence.json`, unlike the other two.
 */
export async function getEssences(context: RepoeContext): Promise<Essences> {
  return call<Essences>(
    `${context.baseUrl}/pob-data/poe1/Essence.json`,
    currentHour(),
    context,
  );
}
