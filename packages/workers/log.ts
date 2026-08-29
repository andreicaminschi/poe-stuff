import { createWriteStream, mkdirSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import type { CallEvent } from "@poe/ggg/types";
import { optionalEnv } from "@util/core/env";

/**
 * One JSON object per line on stdout. That is the shape CloudWatch splits into queryable
 * fields by itself and the shape `jq` reads locally, so the same worker is debuggable in
 * both places with no transport, no sink and no dependency — whatever runs it owns where
 * stdout goes.
 *
 * A terminal gets the same events laid out to be read instead. Nothing else changes: the
 * JSON is what is written whenever stdout is not a terminal, which is every case where
 * something is collecting it.
 */
const chosen = optionalEnv("LOG_FORMAT");
const readable =
  chosen === "pretty" ||
  (chosen === undefined && process.stdout.isTTY === true);

/**
 * Colour only where it will render. The Windows console host does not handle escape
 * sequences unless virtual terminal processing is switched on, and printing them anyway
 * turns every line into `[2m13:29:58[0m`. `hasColors` asks the stream itself, and
 * honours `FORCE_COLOR` and `NO_COLOR` on the way.
 *
 * Without colour the layout still carries the meaning: fixed columns, and the numbers
 * that matter written out rather than shaded.
 */
const coloured =
  readable &&
  typeof process.stdout.hasColors === "function" &&
  process.stdout.hasColors();

/**
 * Where a run keeps a copy of itself, one file per process.
 *
 * The console can be pretty, scrolled past, or closed; the file is always the JSON line,
 * always complete, and still there afterwards to grep. `LOG_DIR` naming a folder is the
 * whole switch — production leaves it unset, because whatever collects stdout there is
 * already keeping the same lines.
 */
function openLog(dir: string) {
  mkdirSync(dir, { recursive: true });

  // Sortable, and unique enough that two workers started in the same second get a file
  // each rather than one interleaved one.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  return createWriteStream(join(dir, `${stamp}-${process.pid}.ndjson`), {
    flags: "a",
  });
}

const logDir = optionalEnv("LOG_DIR");
const file = logDir === undefined ? undefined : openLog(logDir);

const DIM = "\u001b[2m";
const BOLD = "\u001b[1m";
const RESET = "\u001b[0m";

const COLOURS: Record<string, string> = {
  wait: "\u001b[34m", // blue: time we chose to lose
  request: "\u001b[37m",
  response: "\u001b[32m", // green, unless the status says otherwise
  retry: "\u001b[33m",
  penalize: "\u001b[31m",
  limits: "\u001b[36m",
  cache: "\u001b[35m",
};

const paint = (colour: string, text: string) =>
  coloured && colour !== "" ? colour + text + RESET : text;

/** `13:29:58` — the date is the same all run; the seconds are what is being read. */
const clock = (ts: string) => ts.slice(11, 19);

/** `…/fetch/a3ee…+9?query=6z36q7Z0FG` — enough to tell two requests apart. */
function shortUrl(url: string): string {
  const { pathname, searchParams } = new URL(url);
  const [kind = "", rest = ""] = pathname.split("/").filter(Boolean).slice(-2);
  const parts = rest.split(",");
  const head = parts[0]?.slice(0, 8) ?? "";
  const query = searchParams.get("query");

  return [
    kind,
    parts.length > 1 ? `${head}+${parts.length - 1}` : head,
    query === null ? "" : `q=${query}`,
  ]
    .filter((part) => part !== "")
    .join(" ");
}

/** `4s 11/11 · 12s 15/15 · 300s 27/49 · 21600s 171/999` — where the budget actually is. */
function tiers(event: Extract<CallEvent, { type: "limits" }>): string {
  return event.state
    .map((tier, index) => {
      const rule = event.rules[index];
      const max = rule === undefined ? "?" : rule.max;
      const pressure = rule !== undefined && tier.hits >= rule.max * 0.5;
      const text = `${tier.windowSeconds}s ${tier.hits}/${max}`;

      // A star where there is no bold to be had: which tier is filling is the one thing
      // in this line that has to survive a console without colour.
      if (!pressure) return text;

      return coloured ? paint(BOLD, text) : `*${text}`;
    })
    .join(" · ");
}

function describe(event: CallEvent): string {
  switch (event.type) {
    case "wait":
      // Time lost is only useful next to what it was lost to. The limiter knows which
      // tier held the request and how full it was; that reason rides on the event.
      return event.reason === undefined
        ? `${(event.ms / 1000).toFixed(1)}s`
        : `${(event.ms / 1000).toFixed(1)}s — ${event.reason}`;
    case "request":
      return `${event.method} ${shortUrl(event.url)}${event.attempt > 0 ? ` attempt ${event.attempt + 1}` : ""}`;
    case "response":
      // Colour by what came back, not by the fact that something did: a 429 in a column
      // of green is exactly the line that should not blend in.
      return paint(
        event.status >= 400 ? COLOURS.penalize! : COLOURS.response!,
        `${event.status} in ${event.durationMs}ms`,
      );
    case "retry":
      return `${event.status}, backing off ${event.backoffMs}ms`;
    case "penalize":
      return `${event.seconds}s held (${event.source})`;
    case "cache":
      return event.result;
    case "limits":
      return `${event.policy} ${tiers(event)}`;
    default:
      return "";
  }
}

/**
 * Which worker wrote the line. One limiter is one IP, and one worker process holds one
 * limiter per queue — so on EC2, where the hostname is the instance's private DNS name,
 * this names the budget every line below it was paced against. The pid separates two
 * workers started on one box.
 *
 * Read once: neither the hostname nor the pid changes while the process runs.
 */
const worker = `${hostname()}/${process.pid}`;

/** What every line carries, whichever shape it is written in. */
type Line = Record<string, unknown> & { ts: string; type: string };

/**
 * `line` is the record — every field, in the shape CloudWatch and `jq` read. `detail` is
 * only how that record reads to a person. The file and a collected stdout always get the
 * record; the terminal gets the sentence.
 */
function write(line: Line, detail?: string): void {
  // Stamped here rather than in the labels each call site builds: which process wrote a
  // line is not something a call site should have to remember. The terminal is left out
  // of it — a laptop runs one worker, and the record is what gets collected.
  const json = JSON.stringify({ worker, ...line });

  // Whatever the console is doing, the file keeps the machine-readable shape, so a run
  // can be read back long after its terminal is gone.
  file?.write(`${json}\n`);

  if (!readable) {
    console.log(json);
    return;
  }

  const { ts, type, queue, job, ...rest } = line;
  const colour = type === "response" ? "" : (COLOURS[type] ?? "");

  console.log(
    [
      paint(DIM, clock(ts)),
      String(queue ?? "").padEnd(6),
      paint(colour, type.padEnd(8)),
      detail ??
        Object.entries(rest)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(" "),
    ].join(" "),
  );
}

/** A line of the worker's own, rather than one of a request's. */
export function log(
  labels: Record<string, string>,
  fields: Record<string, unknown> & { type: string },
): void {
  write({ ts: new Date().toISOString(), ...labels, ...fields });
}

/**
 * `labels` is how a line finds its way back to the search that produced it: `call`
 * deliberately has no vocabulary for searches or pages, so the context is bound here, at
 * the only layer that knows it.
 */
export function logEvents(
  labels: Record<string, string>,
): (event: CallEvent) => void {
  return (event) => {
    write(
      { ts: new Date().toISOString(), ...labels, ...event },
      readable ? describe(event) : undefined,
    );
  };
}
