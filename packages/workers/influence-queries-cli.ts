import { writeFile } from "node:fs/promises";
import { getStats } from "@poe/ggg/get-stats";
import { createLimiter } from "@poe/ggg/rate-limiter";
import { getInfluenceMods } from "@poe/poe-wiki/get-influence-mods";
import { buildInfluenceQueries } from "./influence-queries.ts";

/**
 * Writes a query file holding one search per influence modifier per tier.
 *
 *     influence-queries-cli.ts <league> [outFile]
 *
 * The file is the same shape `loadQueries` reads, so a cohort can be started from it —
 * but it is written where it is told rather than over `QUERIES_FILE`, because that one is
 * authored by hand and this overwrites whatever it is pointed at.
 *
 * Two requests: one to GGG for the stat list, one to the wiki for the modifiers. Both are
 * cached by the hour where a cache dir is set, so a re-run inside the hour costs nothing.
 */

/**
 * Where the limiter starts for the one GGG call. This process makes a single request, so
 * the opening rule is the only rule it will ever pace against.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

const [league, outFile = "influence-queries.json"] = process.argv.slice(2);

if (league === undefined) {
  console.error("usage: influence-queries-cli.ts <league> [outFile]");
  process.exit(1);
}

const [stats, mods] = await Promise.all([
  getStats({ limiter: createLimiter(OPENING_RULES) }),
  getInfluenceMods(),
]);

const { queries, unmatched, counts } = buildInfluenceQueries(
  stats,
  mods,
  league,
);

await writeFile(outFile, `${JSON.stringify(queries, null, 2)}\n`);

console.log(`wrote ${counts.queries} queries to ${outFile}`);
console.log(
  `  ${counts.rows} wiki rows -> ${counts.mods} droppable modifiers -> ${counts.queries} searched, ${unmatched.length} unsearchable`,
);
console.log(
  `  ${counts.undroppable} modifiers left out: no spawn weight on any slot, so nothing drops with them`,
);
console.log(
  `  ${counts.ambiguous} lines needed a count group, ${counts.negated} read as negative increased, ${counts.multiRoll} bounded by their first roll only`,
);

/**
 * The unsearchable ones, loudly. Every one of them is a modifier this tool cannot price,
 * and the list is the only place that is visible — a query file that is simply missing
 * them looks complete.
 */
if (unmatched.length > 0) {
  const droppable = unmatched.filter((mod) => mod.weight > 0);

  console.log(
    `\nno GGG stat matches these ${unmatched.length} modifiers (${droppable.length} of them droppable):`,
  );

  for (const mod of [...unmatched].sort((a, b) => b.weight - a.weight)) {
    const lines = mod.lines.map((line) => line.replace(/\s+/g, " ")).join(" / ");
    console.log(
      `  [${mod.weight === 0 ? "undroppable" : `weight ${mod.weight}`}] ${mod.influence} ${mod.id}: ${lines}`,
    );
  }
}
