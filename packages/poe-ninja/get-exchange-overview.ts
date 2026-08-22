import { GAME_PATH } from "./config.ts";
import { fetchJson } from "./fetch-json.ts";
import type { ExchangeOverviewResponse, ExchangeType } from "./types.ts";

/**
 * One league's Currency Exchange book for one `type`, from
 * `GET /poe1/api/economy/exchange/current/overview`.
 *
 * **Returned whole rather than as its `lines`.** All three keys are load-bearing and none
 * of them can answer alone: `lines` prices a slug, `items` says what that slug is called,
 * and `core` carries the currency the prices are quoted in along with the rate to the
 * other side. A caller handed only the lines would have a list of numbers attached to
 * `accelerating-catalyst` and no way to name it.
 *
 * This is the Currency Exchange — a real book with a real counterparty — and not
 * `stash/current/currency/overview`, which is what people ask for each other's currency
 * in trade listings. The two disagree, and only one of them is a price.
 */
export async function getExchangeOverview(
  league: string,
  type: ExchangeType,
): Promise<ExchangeOverviewResponse> {
  return fetchJson<ExchangeOverviewResponse>(
    `${GAME_PATH}/api/economy/exchange/current/overview`,
    { league, type },
  );
}
