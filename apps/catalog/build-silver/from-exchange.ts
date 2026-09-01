import type { CurrencyMarket } from "@poe/ggg/types";
import { blankItem, tagSource } from "../item.ts";
import type { Item } from "../item.ts";

/**
 * Marks every metadata id that traded this hour.
 *
 * The exchange names both sides of a market by metadata id and never by name, so it speaks
 * the same language the rows are keyed in and needs no lookup at all.
 *
 * A path nothing else knows is RePoE being behind a patch. The row is added under that id
 * with no name, which is what sends it to `unresolved.json` — there is nothing to look up
 * in the taxonomy and nothing a filter could match.
 *
 * `tradedOnExchange` marks both sides of a pair, so it means the id was named in a trade
 * rather than that somebody sold one.
 */
export function fromExchange(
  rows: ReadonlyMap<string, Item>,
  markets: readonly CurrencyMarket[],
): ReadonlyMap<string, Item> {
  const traded = new Set<string>();
  for (const market of markets) {
    for (const id of market.market_pair) traded.add(id);
  }

  const next = new Map(rows);

  for (const id of [...traded].sort()) {
    const seen = next.get(id) ?? {
      ...blankItem(id, null),
      metadataPaths: [id],
    };

    next.set(id, tagSource({ ...seen, tradedOnExchange: true }, "exchange"));
  }

  return next;
}
