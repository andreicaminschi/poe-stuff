/**
 * Publishes and promotes taxonomy versions.
 *
 * ```
 * yarn taxonomy:publish 3.29
 * yarn taxonomy:promote 3.29
 * ```
 *
 * Needs no environment and makes no request: everything it touches is a file under the
 * lake, and the tables it publishes are compiled into this app.
 */

import { createLocalLake, DEFAULT_ROOT } from "./lake.ts";
import { promoteTaxonomy } from "./promote-taxonomy.ts";
import { publishTaxonomy } from "./publish-taxonomy.ts";
import { versionTable } from "./versions.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, version] = args.filter((arg) => !arg.startsWith("--"));

  if (version === undefined) {
    throw new Error("usage: taxonomy-cli.ts <publish|promote> <version>");
  }

  const lake = createLocalLake(flag(args, "root") ?? DEFAULT_ROOT);

  if (command === "publish") {
    const key = await publishTaxonomy(lake, version, versionTable(version));
    process.stdout.write(`published ${version} -> ${key}\n`);
    return;
  }

  if (command === "promote") {
    const key = await promoteTaxonomy(lake, version);
    process.stdout.write(`latest is now ${version} -> ${key}\n`);
    return;
  }

  throw new Error(`Unknown command "${command}". Use publish or promote.`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
