import { spawn } from "node:child_process";

/**
 * Refresh the market, build the buckets, build the filter, draw it.
 *
 *     node packages/filter/pipeline-cli.ts
 *     node packages/filter/pipeline-cli.ts --min-click=3
 *     node packages/filter/pipeline-cli.ts --league Standard --gold-per-divine 800000
 *     node packages/filter/pipeline-cli.ts --serve
 *     node packages/filter/pipeline-cli.ts --no-install
 *
 * The three CLIs it runs already do the work. What this adds is the chain: one fetch, every
 * artifact on disk, and one exit code. `filter-cli.ts --classify` can do the first two in
 * one process, but it holds the buckets in memory — nothing else can read them afterwards,
 * so the tier board and a second emit both mean fetching the league again.
 *
 * **Each phase leaves a file the next one reads.** That is the point of running them apart
 * rather than in one process: after a run, the classifier's output can be inspected, the
 * emitter re-run against it without touching the network, and the board served off it.
 *
 * There is no `--refresh`. Every cache key carries the hour and PoeWatch recomputes on the
 * hour, so a forced re-fetch inside one hour downloads twenty megabytes to get the same
 * bytes back. Phase one is the refresh.
 */

const ENV_FILE = "--env-file=packages/filter/.env";

const BUCKETS = "packages/filter/buckets-draft.json";

const FILTER = "packages/filter/proto.filter";

const STYLED = "packages/filter/poe-stuff.filter";

/** Run one of the package's CLIs to completion, on this same node. */
const run = (script: string, args: readonly string[]): Promise<number> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [ENV_FILE, `packages/filter/${script}`, ...args],
      { stdio: "inherit" },
    );

    child.on("error", reject);
    // A signal leaves `code` null. Nothing here survived it either, so anything that is
    // not a clean zero is a failure.
    child.on("exit", (code) => resolve(code ?? 1));
  });

/** Seconds, to one decimal. Long enough to be worth reporting, short enough to read. */
const took = (from: number): string => `${((Date.now() - from) / 1000).toFixed(1)}s`;

const args = process.argv.slice(2);

/**
 * The levers, on their way to the classifier and nowhere else.
 *
 * By the time the emitter runs they are already baked into every bucket — a tier is a
 * decision the classifier made, and the emitter's job is to write it down, not to revisit
 * it. Forwarding them would be offering a knob that does nothing.
 *
 * `--out` and `--in` are dropped on purpose. This file owns where the artifacts go,
 * because the three CLIs spell that flag the same way and mean different files by it.
 */
const OWNED = new Set(["--out", "--in", "--serve", "--no-install", "--game-dir"]);

const levers = args.filter((arg, index) => {
  if (OWNED.has(arg)) return false;
  // A flag's value, when it was given as two arguments rather than joined by `=`.
  if (OWNED.has(args[index - 1] ?? "")) return false;

  return !/^--(out|in|game-dir)=/.test(arg);
});

/** Where the styled filter goes, on its way to phase three and nowhere else. */
const INSTALL = new Set(["--no-install", "--game-dir"]);

const install = args.filter(
  (arg, index) =>
    INSTALL.has(arg) ||
    INSTALL.has(args[index - 1] ?? "") ||
    arg.startsWith("--game-dir="),
);

const started = Date.now();

console.error("[1/3] classify — fetch the league, build the buckets");
const phase = Date.now();

const classified = await run("classify-cli.ts", [...levers, "--out", BUCKETS]);

if (classified !== 0) {
  console.error(`\nclassify failed after ${took(phase)}. Nothing was emitted.`);
  process.exitCode = classified;
} else {
  console.error(`\n[2/3] filter — emit the blocks, verify every bucket (${took(phase)})`);
  const emitting = Date.now();

  // No levers and no `--classify`: the buckets are on disk, and this phase must not go
  // near the network. Re-fetching here could classify a different market than the one the
  // file above was built from, and the two artifacts would disagree.
  const emitted = await run("filter-cli.ts", ["--in", BUCKETS, "--out", FILTER]);

  // Phase three is skipped when phase two failed, and skipped rather than run and left
  // uninstalled. A filter with a bucket some other block answers for shows the wrong thing,
  // and the copy that would be drawn and dropped in the game folder is that same file.
  let styled = 1;

  if (emitted === 0) {
    console.error(
      `\n[3/3] style — draw every block, install it where the game reads (${took(emitting)})`,
    );

    styled = await run("style-cli.ts", ["--in", FILTER, "--out", STYLED, ...install]);
  }

  console.error(
    [
      "",
      `${BUCKETS}`,
      `${FILTER}`,
      ...(emitted === 0 ? [`${STYLED}`] : []),
      emitted !== 0
        ? `pipeline finished in ${took(started)} with buckets the filter answers for wrongly. Nothing was styled.`
        : styled !== 0
          ? `pipeline finished in ${took(started)}: the blocks are sound, the styling is not`
          : `pipeline ok in ${took(started)}`,
    ].join("\n"),
  );

  process.exitCode = emitted !== 0 ? emitted : styled;

  // Only after the artifacts are written and reported, and only if they are sound. A
  // board served off a filter that verifies wrongly is a board showing tiers the file
  // does not honour.
  if (emitted === 0 && styled === 0 && args.includes("--serve")) {
    // The server holds the process open until it is interrupted. That is the command
    // working, not the command hanging.
    process.exitCode = await run("serve-cli.ts", ["--open"]);
  }
}
