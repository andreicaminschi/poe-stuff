import { fanOut } from "./fan-out.ts";
import { getExchangeOverview } from "./get-exchange-overview.ts";
import { EXCHANGE_TYPES } from "./types.ts";
import type {
  ExchangeItemMeta,
  ExchangeLine,
  ExchangeType,
  NinjaExchangeItem,
} from "./types.ts";

/**
 * The Currency Exchange for one league, across all 18 exchange types.
 *
 * **The book, not the listings.** Everything here changed hands on GGG's own exchange
 * with a counterparty on the other side, which is a different and better claim than what
 * somebody asked for an item in a trade listing.
 *
 * The three parts of each response are all load-bearing: `lines` prices a slug, `items`
 * says what the slug is called, and `core` names the currency the prices are quoted in.
 * They are put back together here so a caller gets rows that name themselves.
 *
 * 931 rows across the 18 types in the league this was built against, with no slug
 * appearing under two types.
 */

/**
 * What each exchange type is, in the category vocabulary a filter reads a market in.
 *
 * **The type is used and the row's own `category` is not.** poe.ninja tags each row with
 * GGG's static group — `Fragments`, `Cards`, `Currency` — which puts scarabs, astrolabes,
 * ritual vessels and reliquary keys in one drawer called `Fragments`. The type that was
 * asked for is the finer answer and the one that survives a league adding a mechanic.
 *
 * Every row was checked against a PoeWatch dump of the same league: a Runegraft, an
 * Astrolabe, a Tattoo, an Omen and an Expedition artifact really are all `currency`
 * there; a Ducat is `deepwater`; an Allflame Ember is `fragment`.
 */
const EXCHANGE_CATEGORIES: Readonly<Record<ExchangeType, string>> = {
  Currency: "currency",
  Fragment: "fragment",
  Runegraft: "currency",
  AllflameEmber: "fragment",
  Tattoo: "currency",
  Omen: "currency",
  // Empty in the league this was built against, and absent from PoeWatch entirely.
  DjinnCoin: "currency",
  Ducat: "deepwater",
  // Absent from PoeWatch, so this follows the Ducats it shares a league mechanic with.
  EnshroudingCrystal: "deepwater",
  // The one type that must not land on a stackable word: a divination card is priced per
  // card and a filter that laddered it by stack size would be promising a pile the game
  // does not drop.
  DivinationCard: "card",
  Artifact: "currency",
  Oil: "oils",
  DeliriumOrb: "delirium",
  Scarab: "scarab",
  Astrolabe: "currency",
  Fossil: "delve",
  Resonator: "delve",
  Essence: "essence",
};

/**
 * A stable negative id for an exchange slug.
 *
 * **Negative because the two feeds do not share a namespace.** poe.ninja's item overview
 * hands out its own positive ids and the exchange hands out slugs; an exchange row that
 * happened to take an item row's number would be read as the same item priced twice.
 *
 * FNV-1a rather than a counter, because a counter depends on the order the fan-out
 * finished in — the same slug has to key the same row on every run, in every process, or
 * a caller joining two runs joins nothing.
 */
export function slugId(slug: string): number {
  let hash = 0x811c9dc5;

  for (let at = 0; at < slug.length; at += 1) {
    hash ^= slug.charCodeAt(at);
    // The FNV prime, as shifts: `Math.imul` keeps this in 32 bits, which plain `*` does
    // not — a float here would collide on long slugs.
    hash = Math.imul(hash, 0x01000193);
  }

  // Unsigned, then negated. Zero maps to -1 so no slug can ever answer with 0.
  return -((hash >>> 0) + 1);
}

/** The currency every price in this package is quoted in. */
const CHAOS = "chaos";

/** One side of a row that never traded, which is the shape the fields below default to. */
const emptySide = { value: 0, lowConfidence: false, timestamp: 0, volume: 0, change24H: 0 };

export async function getExchangeRatios(
  league: string,
): Promise<readonly NinjaExchangeItem[]> {
  const perType = await fanOut(EXCHANGE_TYPES, async (type: ExchangeType) => {
    const book = await getExchangeOverview(league, type);

    // The whole file assumes chaos. poe.ninja has quoted every PoE1 type in it, and if
    // that ever changes the prices are still numbers and every one of them is wrong by
    // whatever the new unit is worth — which is exactly the kind of failure that has to
    // be loud rather than absorbed.
    if (book.core.primary !== CHAOS) {
      throw new Error(
        `poe-ninja: ${type} is quoted in ${book.core.primary}, not ${CHAOS}`,
      );
    }

    const names = new Map<string, ExchangeItemMeta>();
    for (const item of book.items) names.set(item.id, item);

    // Chaos per divine, from the book's own rate. `rates.divine` is the divine side of
    // one chaos — 0.004899 — so a divine is its reciprocal, and a zero would be a rate
    // that does not exist rather than a free divine.
    const perChaos = book.core.rates[book.core.secondary] ?? 0;

    return book.lines.flatMap((line) =>
      toExchangeItem(line, names.get(line.id), EXCHANGE_CATEGORIES[type], perChaos),
    );
  });

  return perType.flat();
}

/**
 * One line, named and priced.
 *
 * A line whose slug is in no `items` array is dropped rather than named after its slug: a
 * row called `accelerating-catalyst` is not an item any filter can look up, and a made-up
 * name is worse than a missing row.
 */
function toExchangeItem(
  line: ExchangeLine,
  meta: ExchangeItemMeta | undefined,
  category: string,
  divinePerChaos: number,
): NinjaExchangeItem[] {
  if (meta === undefined) return [];

  const chaos = line.primaryValue;
  const divine = divinePerChaos === 0 ? 0 : chaos * divinePerChaos;
  const change = line.sparkline?.totalChange ?? 0;

  return [
    {
      id: slugId(line.id),
      name: meta.name,
      icon: meta.image ?? "",
      category,
      chaos: {
        ...emptySide,
        value: chaos,
        chaosValue: chaos,
        divineValue: divine,
        volume: line.volumePrimaryValue,
        change24H: change,
      },
      // The same market restated, not a second one. poe.ninja quotes one book in one
      // currency and publishes the rate to the other side once, so a divine price here is
      // arithmetic on the chaos price rather than evidence of anyone trading in divines.
      divine: {
        ...emptySide,
        value: divine,
        chaosValue: chaos,
        divineValue: divine,
        volume: line.volumePrimaryValue,
        change24H: change,
      },
    },
  ];
}
