/**
 * Reads one item and prints it.
 *
 * ```
 * node --env-file=packages/item/.env packages/item/item-cli.ts data/sample-items/rare-ring.txt
 * node --env-file=packages/item/.env packages/item/item-cli.ts --filter-item < item.txt
 * ```
 *
 * The stat list is fetched through `@poe/ggg/get-stats`, which paces the one request behind
 * the limiter and caches the answer for an hour — so a second run inside the hour costs no
 * request at all. `--filter-item` skips the fetch entirely: the filter shape is structural
 * and needs no stat ids.
 */

import { readFile } from "node:fs/promises";
import { getStats } from "@poe/ggg/get-stats";
import { createLimiter } from "@poe/ggg/rate-limiter";
import { parseItem } from "./parse-item.ts";
import { modMatcher, resolveItem } from "./resolve-item.ts";
import { toFilterItem } from "./to-filter-item.ts";

/**
 * Where the limiter starts for the one GGG call.
 *
 * This process makes a single request, so the opening rule is the only rule it will ever
 * pace against — GGG's own headers arrive too late to matter.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

/** Everything on stdin, for the pipe case. */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const asFilterItem = args.includes("--filter-item");
  const path = args.find((arg) => !arg.startsWith("--"));

  const text = path === undefined ? await readStdin() : await readFile(path, "utf8");
  const item = parseItem(text);

  if (asFilterItem) {
    process.stdout.write(`${JSON.stringify(toFilterItem(item), undefined, 2)}\n`);
    return;
  }

  const stats = await getStats({ limiter: createLimiter(OPENING_RULES) });
  const resolved = resolveItem(item, modMatcher(stats));

  process.stdout.write(`${JSON.stringify(resolved, undefined, 2)}\n`);
}

await main();
