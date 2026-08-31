import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { GGGService } from "@poe/ggg/service";
import type { BaseItems } from "@poe/repoe/get-base-items.types";
import { blankItem, tagSource } from "../types.ts";
import type { Item, ItemsByKey, Market } from "../types.ts";

export type CollectOptions = {
  readonly ggg: GGGService;
  readonly hourId: number;
  /** Handed to `fetchCurrencyHour`, which answers with only this league's markets. */
  readonly league: string;
  readonly baseItems: BaseItems;
};

export type CollectedItems = {
  readonly items: ItemsByKey;
  /** How many the exchange traded that RePoE cannot name. */
  readonly absentInRepoe: number;
};

/**
 * Everything except currency, from `/data/items`.
 *
 * The `currency` group is skipped: the exchange owns that half and knows about a currency
 * hours before the trade site does. Taking both would mean two sources disagreeing about
 * the same item with no way to say which is right.
 *
 * A unique is listed once per base it can roll on, so the same name arrives more than
 * once. Those fold into one row, which is why the map is read back as it is filled.
 */
function collectTradeItems(groups: readonly GGGItemGroup[]): ItemsByKey {
  const items = new Map<string, Item>();

  for (const group of groups) {
    if (group.id === "currency") continue;

    for (const entry of group.items) {
      const name = entry.kind === "unique" ? entry.name : entry.baseType;
      if (name.trim() === "") continue;

      const seen = items.get(name) ?? blankItem(name);
      const item = tagSource({ ...seen, category: group.id }, "items");

      items.set(
        name,
        entry.kind === "unique"
          ? {
              ...item,
              isUnique: true,
              baseTypes: item.baseTypes.includes(entry.baseType)
                ? item.baseTypes
                : [...item.baseTypes, entry.baseType],
            }
          : item,
      );
    }
  }

  return items;
}

/**
 * The list, plus one row for every currency the exchange traded this hour.
 *
 * The exchange is the truth for currency because it reports one the hour it trades, where
 * `/data/items` waits for a player to list it. It reports metadata ids and never names, so
 * RePoE is the only thing that can turn one into a line a filter can match.
 *
 * A path RePoE cannot name is not a strange item — it is RePoE being behind. The row is
 * kept, keyed by its metadata leaf, with no name and an `absentInRepoe` flag. A filter
 * ignores it for free: with no name there is nothing for `BaseType` to match.
 *
 * The markets arrive filtered to one league. `buildItemList` does that, because the hour
 * carries every league in one payload.
 */
function addExchangeCurrency(
  items: ItemsByKey,
  markets: readonly Market[],
  baseItems: BaseItems,
): CollectedItems {
  const paths = new Set<string>();
  for (const market of markets) {
    for (const path of market.market_pair ?? []) paths.add(path);
  }

  const next = new Map<string, Item>(items);
  let absentInRepoe = 0;

  for (const path of [...paths].sort()) {
    const base = baseItems[path];
    const named = base !== undefined;
    const key = named ? base.name : (path.split("/").pop() ?? path);

    const seen = next.get(key) ?? blankItem(key, named ? base.name : null);

    if (!named) absentInRepoe += 1;

    next.set(
      key,
      tagSource(
        {
          ...seen,
          metadataPaths: seen.metadataPaths.includes(path)
            ? seen.metadataPaths
            : [...seen.metadataPaths, path],
          tradedOnExchange: true,
          absentInRepoe: seen.absentInRepoe || !named,
        },
        "exchange",
      ),
    );
  }

  return { items: next, absentInRepoe };
}

/**
 * Two sources of truth, merged: `/data/items` for everything but currency, the exchange
 * for currency. Both are read here rather than handed in.
 *
 * The two GGG calls run one after another: one service is one IP, and one IP is one
 * budget. `baseItems` is a parameter rather than a third call, because the caller has
 * already downloaded it and it is needed here only to turn a metadata path into a name.
 *
 * RePoE is not read here beyond that. `fillFromRepoe` runs afterwards, so that the game's
 * own data is the last word on any row.
 */
export async function collectItems({
  ggg,
  hourId,
  league,
  baseItems,
}: CollectOptions): Promise<CollectedItems> {
  const exchange = await ggg.fetchCurrencyHour(hourId, { league });
  const itemGroups = await ggg.getItemData();

  const markets = exchange.markets as readonly Market[];

  const tradeOnly = collectTradeItems(itemGroups);

  return addExchangeCurrency(tradeOnly, markets, baseItems);
}
