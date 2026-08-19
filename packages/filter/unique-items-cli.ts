import { getUniqueItems } from "@poe/ggg/get-unique-items";
import { createLimiter } from "@poe/ggg/rate-limiter";
import type { CallEvent } from "@poe/ggg/types";

/**
 * Every unique's name and base item, as JSON on stdout.
 *
 *     node --env-file=packages/workers/.env packages/filter/unique-items-cli.ts > uniques.json
 *
 * With `CACHE_DIR` set, a second run inside the same hour makes no request at all — the
 * hour is part of the cache key. Progress goes to stderr so the redirect stays clean.
 */

/**
 * Where the limiter starts. This process makes one request, so the opening rule is the
 * only rule it will ever pace against — GGG's headers arrive too late to matter here.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

// The digest cache sits in front of `call`, so a hit emits no event at all. Whether a
// request happened is the only thing that says which of the two answered.
let requested = false;

const onEvent = (event: CallEvent) => {
  if (event.type !== "request") return;
  requested = true;
  console.error(`GET ${event.url}`);
};

const uniques = await getUniqueItems({
  limiter: createLimiter(OPENING_RULES),
  onEvent,
});

console.error(
  `${uniques.length} uniques (${requested ? "downloaded" : "cache hit"})`,
);
process.stdout.write(`${JSON.stringify(uniques, null, 2)}\n`);
