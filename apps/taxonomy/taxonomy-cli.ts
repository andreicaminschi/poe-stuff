/**
 * Publishes and promotes taxonomy versions.
 *
 * ```
 * yarn taxonomy:publish 3.29
 * yarn taxonomy:promote 3.29
 * yarn taxonomy:republish          # overwrite whatever latest points at
 * ```
 *
 * Needs no environment and makes no request: everything it touches is a file under the
 * lake, and the tables it publishes are compiled into this app.
 */

import { createLocalLake, DEFAULT_ROOT, pointerKey } from "./lake.ts";
import { promoteTaxonomy } from "./promote-taxonomy.ts";
import { publishTaxonomy } from "./publish-taxonomy.ts";
import type { Lake } from "./types.ts";
import { versionTable } from "./versions.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

const has = (args: readonly string[], name: string): boolean =>
  args.includes(`--${name}`);

/** Whichever version is promoted. What `republish` means by "the last one". */
async function promotedVersion(lake: Lake): Promise<string> {
  const key = pointerKey();

  if (!(await lake.exists(key))) {
    throw new Error(`Nothing is promoted (${key} does not exist). Name a version.`);
  }

  return (await lake.readJson<{ version: string }>(key)).version;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, named] = args.filter((arg) => !arg.startsWith("--"));

  if (command === undefined) {
    throw new Error(
      "usage: taxonomy-cli.ts <publish|republish|promote> [version] [--force]",
    );
  }

  const lake = createLocalLake(flag(args, "root") ?? DEFAULT_ROOT);

  // Republish is publish with the two things a hand pass always wants: the version it is
  // already working on, and permission to overwrite it.
  const republish = command === "republish";

  if (command === "publish" || republish) {
    const version = named ?? (republish ? await promotedVersion(lake) : undefined);

    if (version === undefined) {
      throw new Error("usage: taxonomy-cli.ts publish <version> [--force]");
    }

    const key = await publishTaxonomy(
      lake,
      version,
      versionTable(version),
      republish || has(args, "force"),
    );

    process.stdout.write(`published ${version} -> ${key}\n`);
    return;
  }

  if (command === "promote") {
    if (named === undefined) {
      throw new Error("usage: taxonomy-cli.ts promote <version>");
    }

    const key = await promoteTaxonomy(lake, named);
    process.stdout.write(`latest is now ${named} -> ${key}\n`);
    return;
  }

  throw new Error(
    `Unknown command "${command}". Use publish, republish or promote.`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
