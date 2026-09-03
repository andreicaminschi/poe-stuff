/**
 * Reads a config and a gold catalog, writes a `.filter`.
 *
 * ```
 * yarn generate
 * yarn generate --config=apps/generator/generate.config.json --catalog=<gold folder> --output=<file>
 * ```
 *
 * Needs no environment: everything it reads is a file. The text is parsed back with
 * `@poe/filter-eval` before it is written, so a filter this refuses never reaches the game.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { readConfig } from "./generate-filter/read-config.ts";
import { generateFilter } from "./generate-filter.ts";
import type { CatalogRow, Categories } from "./resolve-conditions.ts";

const DEFAULT_CONFIG = join("apps", "generator", "generate.config.json");

const CATALOG_FILE = "catalog.json";
const CATEGORIES_FILE = "catalog.categories.json";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const configPath = flag(args, "config") ?? DEFAULT_CONFIG;
  const config = readConfig(await readJson(configPath), configPath);

  const catalog = flag(args, "catalog") ?? config.catalog;
  const output = flag(args, "output") ?? config.output;

  const [rows, categories] = await Promise.all([
    readJson<readonly CatalogRow[]>(join(catalog, CATALOG_FILE)),
    readJson<Categories>(join(catalog, CATEGORIES_FILE)),
  ]);

  const generated = generateFilter(rows, categories, config);

  // The independent reader gets the text first. It throws naming the line, which is the
  // whole reason to have it — a block the game would reject is found here, not in game.
  parseFilter(generated.text);

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, generated.text);

  process.stdout.write(`${output}\n`);
  process.stdout.write(`${generated.blocks} blocks from ${rows.length} rows\n`);

  const reasons = new Map<string, number>();
  for (const { reason } of generated.skipped) {
    const kind = reason.replace(/ at .*$/, "");
    reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
  }

  for (const [reason, count] of reasons) {
    process.stdout.write(`skipped ${count}: ${reason}\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
