import { writeFile } from "node:fs/promises";
import { fileCache } from "@util/core/file-cache";
import { ITEM_TYPES } from "./get-item-overview.types.ts";
import type { ItemType } from "./get-item-overview.types.ts";
import type { NinjaExchangeItem } from "./get-exchange-ratios.types.ts";
import type { NinjaItem } from "./get-league-items.types.ts";
import { createPoeNinjaService } from "./service.ts";
import type { CachedResponse } from "./types.ts";

/**
 * Download one league's poe.ninja market and write it to a file.
 *
 *     node services/poe-ninja/dump-cli.ts --league Allflame
 *     node services/poe-ninja/dump-cli.ts --league Allflame --cache-dir cache/poe-ninja
 *     node services/poe-ninja/dump-cli.ts --league Allflame --exchange
 *
 * No `--env-file`: this service is configured through `createPoeNinjaService` and reads no
 * environment. Nothing in the repo reads the package yet, so this is how it is exercised —
 * run it, read the counts, look at the rows. With `--cache-dir`, a second run inside the
 * same hour makes no request at all.
 *
 * The summary goes to stderr, the rows to `--out`.
 */

const DEFAULT_ITEMS_OUT = "ninja-items.json";

const DEFAULT_EXCHANGE_OUT = "ninja-exchange.json";

const args = process.argv.slice(2);

/** One flag's value, spelled either way — `--league X` and `--league=X` both work. */
const flag = (name: string): string | undefined => {
  const joined = args.find((arg) => arg.startsWith(`--${name}=`));
  if (joined !== undefined) return joined.slice(name.length + 3);

  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};

const league = flag("league");
if (league === undefined) {
  throw new Error("no league: pass --league");
}

const exchange = args.includes("--exchange");
const out =
  flag("out") ?? (exchange ? DEFAULT_EXCHANGE_OUT : DEFAULT_ITEMS_OUT);

const cacheDir = flag("cache-dir");

const ninja = createPoeNinjaService({
  userAgent: "poe-stuff/1.0 (dump-cli)",
  ...(cacheDir === undefined
    ? {}
    : { cache: fileCache<CachedResponse>(cacheDir) }),
});

/**
 * A misspelled league is checked for by name, because it does not fail on its own.
 *
 * poe.ninja answers a league it has never heard of with an empty `lines` array on every
 * type — so a typo produces a market with nothing in it, which looks exactly like a
 * league nobody is playing. The list is small and hour-cached, so asking costs one
 * request a day.
 */
const leagues = await ninja.getLeagues();
if (!leagues.some((known) => known.id === league)) {
  throw new Error(
    `no such league on poe.ninja: ${league}. Known: ${leagues.map((known) => known.id).join(", ")}`,
  );
}

console.error(`fetching ${league}…`);

/** How many rows each type contributed, in the order they were asked for. */
const byType = (rows: readonly NinjaItem[]): string[] => {
  const counts = new Map<ItemType, number>();
  for (const row of rows) counts.set(row.ninjaType, (counts.get(row.ninjaType) ?? 0) + 1);

  return ITEM_TYPES.map((type) => {
    const count = counts.get(type) ?? 0;
    // An empty type is normal — four of the 28 are empty in a healthy league — so it is
    // marked rather than hidden, and a reader can see which four they were.
    return `  ${type.padEnd(20)}${String(count).padStart(7)}${count === 0 ? "  (empty)" : ""}`;
  });
};

/** What the exchange said about the two prices everything else is quoted against. */
const rates = (rows: readonly NinjaExchangeItem[]): string[] => {
  const priceOf = (name: string): string => {
    const row = rows.find((item) => item.name === name);
    return row === undefined
      ? `${name}: absent`
      : `${name}: ${(row.chaos.chaosValue ?? row.chaos.value).toFixed(2)}c`;
  };

  // A missing divine is the one absence worth stopping on: it is the unit every large
  // price in the game is quoted in, and a market without it prices nothing.
  return [`  ${priceOf("Divine Orb")}`, `  ${priceOf("Chaos Orb")}`];
};

if (exchange) {
  const rows = await ninja.getExchangeRatios(league);
  await writeFile(out, `${JSON.stringify(rows, null, 1)}\n`);

  console.error(
    [`${rows.length} exchange rows`, ...rates(rows), "", `wrote ${out}`].join("\n"),
  );
} else {
  const rows = await ninja.getLeagueItems(league);
  await writeFile(out, `${JSON.stringify(rows, null, 1)}\n`);

  console.error(
    [
      `${rows.length} rows across ${ITEM_TYPES.length} types`,
      ...byType(rows),
      "",
      `wrote ${out}`,
    ].join("\n"),
  );
}
