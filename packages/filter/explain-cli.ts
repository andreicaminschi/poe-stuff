import { readFile } from "node:fs/promises";
import { explainItem } from "./explain-item.ts";

/**
 * Ask the finished filter what it does with one item.
 *
 *     Get-Clipboard | node packages/filter/explain-cli.ts
 *     node packages/filter/explain-cli.ts data/sample-items/rare-ring.txt
 *     node packages/filter/explain-cli.ts --all data/sample-items/beast.txt
 *     node packages/filter/explain-cli.ts --filter packages/filter/proto.filter
 *
 * The item is read off stdin unless a path is given, so a copied item goes straight in.
 * Prints JSON and nothing else: no network, no env, no cache.
 *
 * By default the rules are the ones the game applies — every `Continue` block plus the one
 * that stopped the walk. `--all` adds the blocks whose conditions match but that never run
 * because something above them took the item first, marked `shadowed`.
 */

const DEFAULT_FILTER = "packages/filter/poe-stuff.filter";

const args = process.argv.slice(2);

/** One flag's value, spelled either way. Same rule as `filter-cli.ts`. */
const flag = (name: string): string | undefined => {
  const joined = args.find((arg) => arg.startsWith(`--${name}=`));
  if (joined !== undefined) return joined.slice(name.length + 3);

  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};

/** Everything on stdin, for the pipe case. */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const filterPath = flag("filter") ?? DEFAULT_FILTER;
  const values = new Set([filterPath, flag("in")]);
  // A positional path is the item file. The flag values are skipped, or `--filter x.filter`
  // would be read as the item as well.
  const itemPath =
    flag("in") ?? args.find((arg) => !arg.startsWith("--") && !values.has(arg));

  const [itemText, filterText] = await Promise.all([
    itemPath === undefined ? readStdin() : readFile(itemPath, "utf8"),
    readFile(filterPath, "utf8"),
  ]);

  const explanation = explainItem(itemText, filterText, {
    all: args.includes("--all"),
  });

  process.stdout.write(`${JSON.stringify(explanation, undefined, 2)}\n`);
}

await main();
