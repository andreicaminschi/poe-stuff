import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export type LogLevel = "info" | "warn" | "error";

export type Logger = {
  readonly log: (level: LogLevel, event: string, fields?: Readonly<Record<string, unknown>>) => void;
  readonly flush: () => Promise<void>;
};

/** Reads a thrown value as plain fields, keeping its cause chain. */
export function describeError(error: unknown): Readonly<Record<string, unknown>> {
  if (!(error instanceof Error)) return { message: String(error) };
  return {
    message: error.message,
    stack: error.stack,
    ...(error.cause === undefined
      ? {}
      : { cause: describeError(error.cause) }),
  };
}

/** One JSON line per event, into a file per day under `dir`, and to the console. Writes never block the caller. */
export function createLogger(dir: string): Logger {
  let pending: Promise<void> = mkdir(dir, { recursive: true }).then(() => undefined);

  return {
    log: (level, event, fields = {}) => {
      const at = new Date().toISOString();
      const line = JSON.stringify({ at, level, event, ...fields });
      const file = join(dir, `${at.slice(0, 10)}.jsonl`);

      if (level === "error") console.error(line);
      else console.log(line);
      pending = pending.then(() => appendFile(file, `${line}\n`)).catch((error: unknown) => console.error("log write failed", error));
    },
    flush: () => pending,
  };
}
