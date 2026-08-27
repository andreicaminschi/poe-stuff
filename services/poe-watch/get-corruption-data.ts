import { call, currentHour } from "./call.ts";
import type { ItemCorruptions } from "./get-corruption-data.types.ts";
import type { PoeWatchContext } from "./types.ts";

/**
 * Priced corruption outcomes for one league, from `GET /corruptions`.
 *
 * `all=true` is fixed rather than a parameter: the whole point of pulling this is to
 * have every item's outcomes to filter against locally.
 *
 * Unlike `/compact` this answers with a bare array, no envelope.
 */
export function getCorruptionData(
  league: string,
  context: PoeWatchContext,
): Promise<readonly ItemCorruptions[]> {
  return call<readonly ItemCorruptions[]>(
    `${context.baseUrl}/corruptions?league=${encodeURIComponent(league)}&all=true`,
    currentHour(),
    context,
  );
}
