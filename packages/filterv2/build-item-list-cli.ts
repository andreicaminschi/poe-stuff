import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { requireEnv } from "@util/core/env";
import { buildItemList } from "./build-item-list.ts";

/**
 * Write `data/items.json`: every item the game can show, named and flagged.
 *
 *     node --env-file=packages/filterv2/.env packages/filterv2/build-item-list-cli.ts
 *     node --env-file=packages/filterv2/.env packages/filterv2/build-item-list-cli.ts --league Standard
 *     node --env-file=packages/filterv2/.env packages/filterv2/build-item-list-cli.ts --force-search
 *
 * The forum is searched at most once a day, and only its newest thread is ever read.
 * `--force-search` overrides the once-a-day part.
 *
 * RePoE's export is cached under `cache/repoe`, keyed by the hour: a re-run inside
 * the hour costs no download. `--cache-dir` moves it.
 */

const OUT = "packages/filterv2/data/items.json";
const POST_DIR = "packages/filterv2/data/forum-posts";
const CACHE_DIR = "cache/repoe";
const LEAGUE = "Allflame";

const HOUR_SECONDS = 3600;

/** Two hours back: the endpoint serves neither the hour in progress nor the one just closed. */
const latestHour = () => {
  const now = Math.floor(Date.now() / 1000);
  return now - (now % HOUR_SECONDS) - 2 * HOUR_SECONDS;
};

const args = process.argv.slice(2);

const flag = (name: string): string | undefined => {
  const joined = args.find((arg) => arg.startsWith(`--${name}=`));
  if (joined !== undefined) return joined.slice(name.length + 3);

  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};

const out = flag("out") ?? OUT;

const items = await buildItemList({
  userAgent: requireEnv("POE_USER_AGENT"),
  league: flag("league") ?? LEAGUE,
  hourId: Number(flag("hour") ?? latestHour()),
  postDir: flag("post-dir") ?? POST_DIR,
  cacheDir: flag("cache-dir") ?? CACHE_DIR,
  model: flag("model") ?? "sonnet",
  forceSearch: args.includes("--force-search"),
  useForum: !args.includes("--no-forum"),
  log: (line) => process.stderr.write(`${line}\n`),
});

await mkdir(dirname(out), { recursive: true });
await writeFile(out, `${JSON.stringify(items, null, 2)}\n`, "utf8");

const rows = Object.values(items.items);

const count = (of: (item: (typeof rows)[number]) => boolean) =>
  rows.filter(of).length;

process.stderr.write(`\nwrote ${out}\n`);
process.stderr.write(
  `${rows.length} items: ${count((i) => i.isNew)} new, ` +
    `${count((i) => i.absentInRepoe)} absent from RePoE, ` +
    `${count((i) => i.tradedOnExchange)} traded\n`,
);
process.stderr.write(
  `newLeague: ${items.newLeague}, repoeIncomplete: ${items.repoeIncomplete}\n`,
);
