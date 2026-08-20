import { spawn } from "node:child_process";

/**
 * Classify a league, then open the tier board on it.
 *
 *     node packages/filter/tiers-cli.ts
 *     node packages/filter/tiers-cli.ts --min-click=3
 *     node packages/filter/tiers-cli.ts --league Standard
 *
 * The whole reason this file exists rather than two commands joined by `&&`: a package
 * manager appends forwarded arguments to the *last* command in a script, and the last
 * command here is a server that would ignore them. `yarn tiers --min-click=3` has to
 * reach the classifier, so one process takes the arguments and decides where they go.
 *
 * Everything it was given goes to `classify-cli.ts` untouched, and the board is started
 * only if that succeeded — a lever the classifier rejected should not open a browser on
 * yesterday's buckets.
 */

const ENV_FILE = "--env-file=packages/filter/.env";

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

const classified = await run("classify-cli.ts", process.argv.slice(2));

if (classified !== 0) {
  process.exitCode = classified;
} else {
  // The server holds the process open until it is interrupted. That is the command
  // working, not the command hanging.
  process.exitCode = await run("serve-cli.ts", ["--open"]);
}
