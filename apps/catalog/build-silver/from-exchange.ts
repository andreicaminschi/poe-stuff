import type { CurrencyMarket } from "@poe/ggg/types";
import type { BaseItems } from "@poe/repoe/get-base-items.types";
import { blankItem, tagSource, withValue } from "../item.ts";
import type { Item } from "../item.ts";

/**
 * Every metadata path that traded this hour, folded into the rows.
 *
 * A market names both of its sides by metadata id and never by name, so RePoE is the only
 * thing that can turn one into a row a filter could match. A path RePoE cannot name is not
 * a strange item — it is RePoE being behind a patch. The row is kept under its metadata
 * leaf with a null name, and `classifyItems` is what files it as unresolved.
 *
 * The markets arrive already trimmed to one league by the extract step.
 */
export function fromExchange(
  items: ReadonlyMap<string, Item>,
  markets: readonly CurrencyMarket[],
  baseItems: BaseItems,
): ReadonlyMap<string, Item> {
  const paths = new Set<string>();
  for (const market of markets) {
    for (const path of market.market_pair) paths.add(path);
  }

  const next = new Map(items);

  for (const path of [...paths].sort()) {
    const base = baseItems[path];
    const key = base?.name ?? path.split("/").pop() ?? path;

    const seen = next.get(key) ?? blankItem(key, base?.name ?? null);

    next.set(
      key,
      tagSource(
        {
          ...seen,
          metadataPaths: withValue(seen.metadataPaths, path),
          tradedOnExchange: true,
        },
        "exchange",
      ),
    );
  }

  return next;
}
