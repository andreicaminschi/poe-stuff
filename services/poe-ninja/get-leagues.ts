import { fetchJson } from "./call.ts";
import { GAME_PATH } from "./config.ts";
import type { EconomyLeague } from "./get-leagues.types.ts";
import type { PoeNinjaContext } from "./types.ts";

/**
 * Every league poe.ninja has an economy for, from
 * `GET /poe1/api/economy/leagues`.
 *
 * `id` is what every other call wants — the ids happen to read like the names today
 * (`Allflame`, `Hardcore Allflame`, `Standard`, `Hardcore`), and that is a coincidence of
 * this league rather than a rule to lean on.
 *
 * Worth calling before a fan-out: a misspelled league does not fail, it answers with
 * empty `lines` for all 28 types, and a market that is empty for the right reason and one
 * that is empty for the wrong reason look identical afterwards.
 *
 * Answers with a bare array, no envelope.
 */
export function getLeagues(
  context: PoeNinjaContext,
): Promise<readonly EconomyLeague[]> {
  return fetchJson<readonly EconomyLeague[]>(
    `${GAME_PATH}/api/economy/leagues`,
    {},
    context,
  );
}
