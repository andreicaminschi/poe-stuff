import { createLakeService } from "@poe/lake/service";
import { createTaxonomy } from "./create-taxonomy.ts";
import { promoteTaxonomy } from "./promote-taxonomy.ts";
import { publishTaxonomy } from "./publish-taxonomy.ts";
import { readVersionFiles } from "./read-version-files.ts";
import { highestDraft, readRegistry, versionNumber } from "./registry.ts";
import {
  resolutionProblems,
  resolveCategory,
  resolveRow,
  unauthoredCategories,
} from "./resolve-conditions.ts";
import type { Lake } from "@poe/lake/types";
import { collectVersion } from "./validate-version.ts";
import { buildVersion, versionTable } from "./versions.ts";

const USAGE =
  "usage: taxonomy-cli.ts <list|create|publish|promote|validate|resolve> [version] [--parent=<v>] [--id=<key>] [--category=<path>] [--root=<dir>]";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

const json = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

async function list(lake: Lake): Promise<void> {
  const registry = await readRegistry(lake);
  const highest = highestDraft(registry);
  const rows = Object.entries(registry.versions).sort(
    ([a], [b]) => versionNumber(b) - versionNumber(a),
  );

  if (rows.length === 0) {
    process.stdout.write("no versions exist\n");
    return;
  }

  for (const [version, entry] of rows) {
    const zombie = entry.state === "draft" && version !== highest ? " (overtaken)" : "";
    const from = entry.parent === undefined ? "" : ` from ${entry.parent}`;
    process.stdout.write(`${version}\t${entry.state}${zombie}${from}\n`);
  }
}

async function validate(lake: Lake, version: string): Promise<void> {
  const files = await readVersionFiles(lake, version);
  const problems = collectVersion(files);

  if (problems.length > 0) {
    return json({ problems, resolution: [], unauthored: {} });
  }

  const table = buildVersion(version, files);

  json({
    problems,
    resolution: resolutionProblems(table),
    unauthored: unauthoredCategories(table),
  });
}

async function resolve(lake: Lake, version: string, args: readonly string[]): Promise<void> {
  const id = flag(args, "id");
  const category = flag(args, "category");
  const table = await versionTable(lake, version);

  if (id !== undefined) return json(resolveRow(table, id));
  if (category !== undefined) return json(resolveCategory(table, category));

  throw new Error("usage: taxonomy-cli.ts resolve <version> --id=<key> | --category=<path>");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, named] = args.filter((arg) => !arg.startsWith("--"));

  if (command === undefined) {
    throw new Error(USAGE);
  }

  const lake = createLakeService({ root: flag(args, "root") });

  if (command === "list") {
    await list(lake);
    return;
  }

  if (command === "create") {
    const parent = flag(args, "parent");

    if (parent === undefined) {
      throw new Error("usage: taxonomy-cli.ts create --parent=<published version>");
    }

    const version = await createTaxonomy(lake, parent);
    process.stdout.write(`created ${version} from ${parent}\n`);
    return;
  }

  if (named === undefined) {
    throw new Error(USAGE);
  }

  if (command === "publish") {
    const keys = await publishTaxonomy(lake, named, await versionTable(lake, named));
    process.stdout.write(`published ${named} -> ${keys.join(", ")}\n`);
    return;
  }

  if (command === "promote") {
    const keys = await promoteTaxonomy(lake, named);
    process.stdout.write(`latest is now ${named} -> ${keys.join(", ")}\n`);
    return;
  }

  if (command === "validate") return validate(lake, named);
  if (command === "resolve") return resolve(lake, named, args);

  throw new Error(`Unknown command "${command}". ${USAGE}`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
