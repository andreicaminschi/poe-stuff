import { readFile, writeFile } from "node:fs/promises";
import { optionalEnv } from "@util/core/env";
import { classify, marketRates } from "./classify.ts";
import { emitFilter, planBlocks } from "./emit-filter.ts";
import { fetchInputs } from "./fetch-inputs.ts";
import { FILE_LEVERS } from "./tiers.ts";
import { verifyFilter } from "./verify-filter.ts";
import type { Bucket, Levers } from "./types.ts";

/**
 * Write the proto filter.
 *
 *     node packages/filter/filter-cli.ts
 *     node --env-file=packages/filter/.env packages/filter/filter-cli.ts --classify
 *     node packages/filter/filter-cli.ts --in packages/filter/buckets-draft.json
 *
 * By default it reads the buckets `classify-cli.ts` last wrote, which costs nothing and
 * needs no env. `--classify` fetches the market and classifies it in the same run, and is
 * the only mode that needs the env file.
 *
 * The file is written either way. What decides the exit code is `verify-filter.ts`: a
 * bucket the finished filter answers for with somebody else's tier is a bug, and a bug that
 * exits zero is a bug nobody finds. A bucket no item can reach is reported and forgiven —
 * that one is a limit of the evaluator, not of the file.
 */

const DEFAULT_IN = "packages/filter/buckets-draft.json";
const DEFAULT_OUT = "packages/filter/proto.filter";

/** What a divine is worth in gold when the player has not said. See `Levers`. */
const DEFAULT_GOLD_PER_DIVINE = 1_000_000;

const args = process.argv.slice(2);

/** One flag's value, spelled either way. Same rule as `classify-cli.ts`. */
const flag = (name: string): string | undefined => {
  const joined = args.find((arg) => arg.startsWith(`--${name}=`));
  if (joined !== undefined) return joined.slice(name.length + 3);

  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};

const out = flag("out") ?? DEFAULT_OUT;

const load = async (): Promise<{ buckets: readonly Bucket[]; stamp: string }> => {
  if (!args.includes("--classify")) {
    const from = flag("in") ?? DEFAULT_IN;
    const buckets = JSON.parse(await readFile(from, "utf8")) as readonly Bucket[];

    return { buckets, stamp: `from ${from}, ${new Date().toISOString()}` };
  }

  const league = flag("league") ?? optionalEnv("POE_WATCH_LEAGUE");
  if (league === undefined) {
    throw new Error("no league: pass --league or set POE_WATCH_LEAGUE");
  }

  const minClick = flag("min-click");
  const goldPerDivine = flag("gold-per-divine");
  const levers: Levers = {
    minClickValue: Number(minClick ?? 0),
    hideUniqueMaps: args.includes("--hide-unique-maps"),
    goldPerDivine: Number(goldPerDivine ?? DEFAULT_GOLD_PER_DIVINE),
    // No flag for either yet. They come off `tiers.json`, where the player sets them.
    gambleCeiling: FILE_LEVERS.gambleCeiling,
    gambleExclude: FILE_LEVERS.gambleExclude,
  };

  console.error(`fetching ${league}…`);
  const input = await fetchInputs(league);
  const divine = marketRates(input.exchange).divine;

  return {
    buckets: classify(input, levers),
    // Both numbers move the whole ladder, so a file without them is one nobody can compare
    // against yesterday's.
    stamp: `${league}, divine ${divine.toFixed(1)}c, click floor ${levers.minClickValue}c, ${new Date().toISOString()}`,
  };
};

const { buckets, stamp } = await load();

const text = emitFilter(buckets, stamp);
await writeFile(out, text);

const conflicts = verifyFilter(buckets, text);
const broken = conflicts.filter((one) => one.reason !== "unprobeable");

const families = new Map<string, number>();
for (const block of planBlocks(buckets)) {
  const family = block.buckets[0]?.family ?? "?";
  families.set(family, (families.get(family) ?? 0) + 1);
}

console.error(
  [
    `${buckets.length} buckets, ${planBlocks(buckets).length} blocks`,
    ...[...families]
      .sort((left, right) => right[1] - left[1])
      .map(([family, count]) => `  ${family.padEnd(20)}${String(count).padStart(6)}`),
    "",
    ...conflicts.map(
      (one) =>
        `${one.reason.padEnd(12)}${one.bucket}\n${"".padEnd(12)}wanted ${one.expected}, got ${one.got}${one.by === "" ? "" : ` from ${one.by}`}`,
    ),
    conflicts.length === 0
      ? "every bucket lands on its own tier and verb"
      : `${broken.length} of ${buckets.length} buckets land somewhere else, ${conflicts.length - broken.length} cannot be probed`,
    "",
    `wrote ${out}`,
  ].join("\n"),
);

// A shadowed bucket is a filter that shows the wrong thing, and the only place it can be
// fixed is the classifier. Failing here is what makes that visible.
if (broken.length > 0) process.exitCode = 1;
