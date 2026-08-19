import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { optionalEnv } from "@util/core/env";
import { buildTierPage } from "./build-tier-page.ts";

/**
 * Serve the tier board on localhost.
 *
 *     node packages/filter/serve-cli.ts [--open]
 *
 * The page is rebuilt on every request rather than served from `tiers.html`, so editing
 * `tier-page.html` or re-running `classify-cli.ts` shows up on a refresh. Re-reading the
 * bucket dump costs a fraction of a second and buys not having to remember a build step.
 *
 * `FILTER_PORT` moves it off 8123. Bound to loopback on purpose — this is a dev tool with
 * no authentication, and it has no business listening on a LAN.
 */

const port = Number(optionalEnv("FILTER_PORT") ?? "8123");

/**
 * Hand the URL to whatever the desktop uses to open one.
 *
 * `detached` plus `unref` matter on Windows: `start` returns immediately but the shell
 * hosting it would otherwise keep this process's stdio open, and the server would look
 * hung until the browser closed.
 */
function openBrowser(url: string): void {
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];

  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  // A machine with no browser is not a reason to take the server down with it.
  child.on("error", () => console.error(`could not open a browser; visit ${url}`));
  child.unref();
}

const server = createServer(async (request, response) => {
  // Anything other than the page itself is a favicon probe or a stray path. One page,
  // one answer — a 404 on everything else keeps the log readable.
  if (request.url !== "/" && request.url !== "/index.html") {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
    return;
  }

  try {
    const { html, count } = await buildTierPage();
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(html);
    console.error(`200 ${count} buckets`);
  } catch (error) {
    // The usual cause is running from somewhere other than the repo root, since the
    // paths in `build-tier-page.ts` are relative to it. Say so rather than a bare stack.
    response.writeHead(500, { "content-type": "text/plain" });
    response.end(String(error));
    console.error(`500 ${String(error)}`);
  }
});

const url = `http://localhost:${port}`;

/**
 * A board already running is the expected case, not a crash.
 *
 * The page rebuilds on every request, so the old process is serving the data that was
 * just written — opening it is the right answer, and a stack trace is not. Exit 0: the
 * user asked to see the board and the board is up.
 */
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code !== "EADDRINUSE") throw error;

  console.error(`already serving on ${url} — reusing it`);
  if (process.argv.includes("--open")) openBrowser(url);
  process.exitCode = 0;
});

server.listen(port, "127.0.0.1", () => {
  console.error(`tier board on ${url}`);
  if (process.argv.includes("--open")) openBrowser(url);
});
