import { call, currentHour } from "./call.ts";
import type { Spectres } from "./get-spectres.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * Every raisable spectre, from `GET /pob-data/poe1/Spectres.json`.
 *
 * **The whole file in one request, with no way to ask for less.** RePoE publishes a static
 * file per export; there is no query, no league and no partial fetch.
 *
 * What comes back is the file itself — an object keyed by monster metadata id, no envelope
 * around it. The stats in it are multipliers against the monster base table rather than
 * absolute numbers, so a row is worth nothing without that table.
 */
export async function getSpectres(context: RepoeContext): Promise<Spectres> {
  return call<Spectres>(
    `${context.baseUrl}/pob-data/poe1/Spectres.json`,
    currentHour(),
    context,
  );
}
