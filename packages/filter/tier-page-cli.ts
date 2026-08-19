import { writeFile } from "node:fs/promises";
import { buildTierPage } from "./build-tier-page.ts";

/**
 * Write the tier board to a standalone file.
 *
 *     node packages/filter/tier-page-cli.ts
 *
 * For publishing, or for handing someone a single file. To look at it locally, use
 * `serve-cli.ts` instead — it rebuilds on every refresh and needs no build step.
 */

const OUT = "packages/filter/tiers.html";

const { html, count } = await buildTierPage();
await writeFile(OUT, html);

console.error(`${count} buckets, ${Math.round(html.length / 1024)} KB -> ${OUT}`);
