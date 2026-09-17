import { createLakeService } from "@poe/lake/service";
import { optionalEnv, requireEnv } from "@util/env";
import { bucketItems } from "./bucket-items.ts";
import { pricesOf } from "./bucket-items/prices-of.ts";
import type { Bucket, Placement, PricedRow, Unplaced } from "./bucket-items/types.ts";
import { catalogKey } from "./lake/keys.ts";

const LADDER: readonly Bucket[] = [
  { name: "T5", floor: 1, ceiling: 10, gamble: true },
  { name: "T4", floor: 10, ceiling: 20, gamble: true },
  { name: "T3", floor: 20, ceiling: 30, gamble: true },
  { name: "T2", floor: 30, ceiling: 40, gamble: false },
  { name: "T1", floor: 40, ceiling: 50, gamble: false },
  { name: "T0", floor: 50, gamble: false },
];

const out = (line: string) => process.stdout.write(`${line}\n`);

const money = (value: number | undefined): string => (value === undefined ? "-" : `${value}c`);

const line = (row: Placement | Unplaced): string =>
  `${row.name} [take ${money(row.prices.take)} check ${money(row.prices.check)} gamble ${money(row.prices.gamble)}]`;

const first = <T>(rows: readonly T[], match: (row: T) => boolean, take = 3): readonly T[] =>
  rows.filter(match).slice(0, take);

function showcase(title: string, rule: string, rows: readonly (Placement | Unplaced)[]): void {
  out("");
  out(`### ${title}`);
  out(rule);

  if (rows.length === 0) {
    out("  no row in the catalog does this");
    return;
  }

  for (const row of rows) {
    const bucket = "bucket" in row ? `${row.bucket} ${row.verb}` : "unplaced";
    out(`  ${bucket.padEnd(12)} ${line(row)}`);
    out(`  ${" ".repeat(12)} ${row.reason}`);
  }
}

async function main(): Promise<void> {
  const league = requireEnv("POE_LEAGUE");
  const lake = createLakeService({ root: optionalEnv("LAKE_ROOT") });
  const rows = await lake.readJson<readonly PricedRow[]>(catalogKey(league));

  const byCategory = new Map<string, PricedRow[]>();
  for (const row of rows) {
    const held = byCategory.get(row.category);
    if (held === undefined) byCategory.set(row.category, [row]);
    else held.push(row);
  }

  out(`# bucketing ${rows.length} rows of ${league}, one category at a time`);
  out("");
  out("ladder: " + LADDER.map((one) => `${one.name} ${one.floor}-${one.ceiling ?? "∞"}c${one.gamble ? " gamble" : ""}`).join(", "));

  const placed: Placement[] = [];
  const unplaced: Unplaced[] = [];

  out("");
  out("## per category");
  out(`${"category".padEnd(18)} ${"rows".padEnd(6)} ${"placed".padEnd(7)} take   check  gamble unplaced`);

  for (const [category, group] of [...byCategory].sort((a, b) => b[1].length - a[1].length)) {
    const result = bucketItems(LADDER, group);
    placed.push(...result.placed);
    unplaced.push(...result.unplaced);

    const count = (verb: string) => result.placed.filter((one) => one.verb === verb).length;

    out(
      `${category.padEnd(18)} ${String(group.length).padEnd(6)} ${String(result.placed.length).padEnd(7)} ` +
        `${String(count("take")).padEnd(6)} ${String(count("check")).padEnd(6)} ${String(count("gamble")).padEnd(6)} ${result.unplaced.length}`,
    );
  }

  out("");
  out("## every rule from the plan, with rows from the catalog");

  showcase(
    "Take",
    "the price as it lies falls inside the bucket",
    first(placed, (one) => one.verb === "take" && one.bucket === "T5"),
  );

  showcase(
    "Take, at the top",
    "the same rule at the open-topped bucket",
    first(placed, (one) => one.verb === "take" && one.bucket === "T0"),
  );

  showcase(
    "Check",
    "cheap as it lies, but a form sharing its look reaches the bucket",
    first(placed, (one) => one.verb === "check" && one.prices.take !== undefined && one.prices.take < 10),
  );

  showcase(
    "Gamble",
    "cheap as it lies, and a corruption reaches a bucket that allows gambling",
    first(placed, (one) => one.verb === "gamble"),
  );

  showcase(
    "Gamble refused, so Check",
    "a corruption would reach higher, but that bucket does not gamble",
    first(
      placed,
      (one) =>
        one.verb === "check" &&
        one.prices.gamble !== undefined &&
        one.prices.check !== undefined &&
        one.prices.gamble > one.prices.check,
    ),
  );

  out("");
  out("## edge cases");

  showcase(
    "Falls in a gap between buckets",
    "the ladder leaves 10-20c and 40-50c unclaimed",
    first(unplaced, (one) => one.reason.includes("gap")),
  );

  showcase(
    "Under every floor",
    "worth something, but less than the cheapest bucket wants",
    first(unplaced, (one) => one.reason.includes("under the")),
  );

  showcase(
    "Priced by nothing",
    "no price on the row, its variants or its uniques",
    first(unplaced, (one) => one.reason === "nothing priced it"),
  );

  showcase(
    "Only a corruption reaches a bucket, and it cannot gamble",
    "the corruption price is the item's best number and no gambling bucket holds it",
    first(unplaced, (one) => one.reason.includes("no bucket there gambles")),
  );

  showcase(
    "Worth more corrupted than a gambling bucket can hold",
    "gamble price above every gambling bucket's ceiling",
    first(
      placed,
      (one) =>
        one.prices.gamble !== undefined &&
        one.prices.gamble >= 30 &&
        one.verb !== "gamble",
      3,
    ),
  );

  showcase(
    "Every number identical",
    "take, check and gamble agree, so the verb is decided by order alone",
    first(
      placed,
      (one) =>
        one.prices.take !== undefined &&
        one.prices.take === one.prices.check &&
        one.prices.check === one.prices.gamble,
    ),
  );

  const backwards = rows
    .map((row) => ({ row, prices: pricesOf(row) }))
    .filter(({ prices }) => prices.take !== undefined && prices.check !== undefined && prices.check < prices.take);

  out("");
  out("### Check below Take");
  out("a row whose best form is worth less than the row itself, which should be impossible");
  out(`  ${backwards.length} rows`);
  for (const { row, prices } of backwards.slice(0, 3)) {
    out(`  ${row.name} take ${money(prices.take)} check ${money(prices.check)}`);
  }

  out("");
  out("## totals");
  out(`placed ${placed.length}, unplaced ${unplaced.length}`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
