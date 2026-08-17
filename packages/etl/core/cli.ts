import type { RunOptions } from "./pipeline.ts";

/** Shared argv handling for the `tools/*.ts` entry points. */
export function parseArgs(tool: string): RunOptions {
  const usage = [
    `Usage: node --env-file=.env tools/${tool}.ts [--from-cache]`,
    "",
    "  --from-cache  transform the cached extract in data/raw/ instead of",
    "                calling the API",
  ].join("\n");

  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage);
    process.exit(0);
  }

  const unknown = args.filter((arg) => arg !== "--from-cache");
  if (unknown[0] !== undefined) {
    console.error(`Unknown argument: ${unknown[0]}\n\n${usage}`);
    process.exit(1);
  }

  return { fromCache: args.includes("--from-cache") };
}
