/**
 * Reads one item and prints it.
 *
 * ```
 * node --env-file=apps/item-inspect/.env apps/item-inspect/item-cli.ts data/sample-items/rare-ring.txt
 * node --env-file=apps/item-inspect/.env apps/item-inspect/item-cli.ts --filter-item < item.txt
 * ```
 *
 * The stat list is fetched through `@poe/ggg`, which paces the one request behind the
 * limiter. **No cache is passed, so every run costs one request.** That is deliberate for
 * now: the service takes a cache as an option and nothing here builds one, so the cost is
 * visible rather than hidden behind a directory that may or may not be warm.
 *
 * `--filter-item` skips the fetch entirely: the filter shape is structural and needs no
 * stat ids, so that path makes no request and needs no environment either.
 */

import { readFile } from "node:fs/promises";
import { createGGGService } from "@poe/ggg/service";
import { requireEnv } from "@util/env";
import { parseItem } from "@poe/item-parser/parse-item";
import { modMatcher, resolveItem } from "@poe/item-parser/resolve-item";
import { toFilterItem } from "@poe/item-parser/to-filter-item";

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

  // Built after the `--filter-item` return, so the path that needs no stat list also needs
  // no `POE_USER_AGENT` — `requireEnv` throws at first use rather than at import.
  const ggg = createGGGService({
    userAgent: requireEnv("POE_USER_AGENT"),
    rules: OPENING_RULES,
  });

  const stats = await ggg.getStats();
  const resolved = resolveItem(item, modMatcher(stats));

  process.stdout.write(`${JSON.stringify(resolved, undefined, 2)}\n`);
}

await main();
