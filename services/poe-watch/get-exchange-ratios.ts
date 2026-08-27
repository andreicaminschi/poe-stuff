import { call, currentHour } from "./call.ts";
import type {
  ExchangeRatioItem,
  ExchangeRatiosResponse,
  Game,
} from "./get-exchange-ratios.types.ts";
import type { PoeWatchContext } from "./types.ts";

/**
 * Every item's Chaos and Divine exchange ratios for one league, from
 * `GET /exchange/ratios`.
 *
 * `game` is part of the request, not a base-url choice — one API serves both games, and
 * league names collide across them. It is in the URL, so it is in the cache key too.
 *
 * The envelope carries nothing but `items`, so the array is what comes back.
 */
export async function getExchangeRatios(
  league: string,
  game: Game,
  context: PoeWatchContext,
): Promise<readonly ExchangeRatioItem[]> {
  const body = await call<ExchangeRatiosResponse>(
    `${context.baseUrl}/exchange/ratios?league=${encodeURIComponent(league)}&game=${game}`,
    currentHour(),
    context,
  );

  return body.items;
}
