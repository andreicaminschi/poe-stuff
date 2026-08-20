import { writeFile } from "node:fs/promises";
import { optionalEnv } from "@util/core/env";
import { classify, marketRates } from "./classify.ts";
import { fetchInputs } from "./fetch-inputs.ts";
import type { Bucket, Levers, Tier, Verb } from "./types.ts";

/**
 * Classify a league's market into buckets.
 *
 *     node --env-file=packages/filter/.env packages/filter/classify-cli.ts
 *     node --env-file=packages/filter/.env packages/filter/classify-cli.ts --league Standard
 *     node --env-file=packages/filter/.env packages/filter/classify-cli.ts --min-click 3
 *
 * `--min-click` is the player lever: the least a single click may be worth, in chaos.
 * It is a flag rather than env because it is the one input meant to be moved between
 * runs — set it, regenerate, look at what went.
 *
 * Every input is fetched from the API that owns it — no file in the tree is read. With
 * `POE_WATCH_CACHE_DIR` and `CACHE_DIR` set, a re-run inside the same hour makes no
 * request at all: the league and the hour are both in every cache key.
 *
 * The summary goes to stderr, the buckets to `--out`.
 */

const DEFAULT_OUT = "packages/filter/buckets-draft.json";

const args = process.argv.slice(2);

/**
 * One flag's value, spelled either way.
 *
 * `--league Standard` and `--league=Standard` both have to work, because a yarn script
 * forwards whatever the shell handed it and nobody remembers which form a CLI wanted.
 * The `=` form is checked first: `--min-click=3` contains no separate `--min-click`
 * argument, so an `indexOf` alone would miss it and quietly fall back to the default.
 */
const flag = (name: string): string | undefined => {
  const joined = args.find((arg) => arg.startsWith(`--${name}=`));
  if (joined !== undefined) return joined.slice(name.length + 3);

  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};

// The league is a fact about the data, so it belongs beside the other env, and a flag
// only exists to classify a second league without editing the file.
const league = flag("league") ?? optionalEnv("POE_WATCH_LEAGUE");
if (league === undefined) {
  throw new Error("no league: pass --league or set POE_WATCH_LEAGUE");
}

const out = flag("out") ?? DEFAULT_OUT;

const minClick = flag("min-click");
if (minClick !== undefined && !(Number(minClick) >= 0)) {
  throw new Error(`--min-click wants chaos, got ${minClick}`);
}

// A bare `--hide-unique-maps` is the whole flag. It takes no value because it has no
// middle setting — the lever is there precisely because the game offers all or nothing.
const levers: Levers = {
  minClickValue: Number(minClick ?? 0),
  hideUniqueMaps: args.includes("--hide-unique-maps"),
};

const TIERS: readonly Tier[] = [
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "varies",
  "hidden",
];
const VERBS: readonly Verb[] = ["take", "check", "gamble"];

/** The tier × verb grid, plus a per-family count. Written to stderr, never to the file. */
function summarize(buckets: readonly Bucket[]): string {
  const cell = (tier: Tier, verb: Verb): number =>
    buckets.filter((bucket) => bucket.tier === tier && bucket.verb === verb)
      .length;

  const grid = [
    `${"".padEnd(8)}${VERBS.map((verb) => verb.padStart(8)).join("")}`,
    ...TIERS.map(
      (tier) =>
        `${tier.padEnd(8)}${VERBS.map((verb) => String(cell(tier, verb)).padStart(8)).join("")}`,
    ),
  ];

  const families = new Map<string, number>();
  for (const bucket of buckets) {
    families.set(bucket.family, (families.get(bucket.family) ?? 0) + 1);
  }

  const rows = [...families]
    .sort((left, right) => right[1] - left[1])
    .map(
      ([family, count]) =>
        `  ${family.padEnd(22)}${String(count).padStart(6)}`,
    );

  return [...grid, "", ...rows].join("\n");
}

console.error(`fetching ${league}…`);

const input = await fetchInputs(league);
const buckets = classify(input, levers);

await writeFile(out, `${JSON.stringify(buckets, null, 1)}\n`);

const { counts } = input;

console.error(
  [
    `${counts.items} rows, ${counts.corruptions} corrupted items, ${counts.exchange} exchange rows`,
    // What the run was generated under. Both numbers move the whole ladder, so a summary
    // that omits them is a grid nobody can compare against yesterday's.
    `divine ${marketRates(input.exchange).divine.toFixed(1)}c, click floor ${levers.minClickValue}c`,
    `${counts.ggg} uniques from GGG, ${counts.wiki} from the wiki, ${input.uniques.filter((unique) => unique.restrictedDrop).length} restricted`,
    `${counts.exceptionalGems} exceptional gems, ${counts.transfiguredGems} transfigured, from the wiki`,
    `${buckets.length} buckets, ${buckets.filter((bucket) => bucket.thin).length} thin`,
    "",
    summarize(buckets),
    "",
    `wrote ${out}`,
  ].join("\n"),
);
