import { performance } from "node:perf_hooks";

const PRINT_EVERY_MS = 10_000;

/** Writes a duration as `42s`, `3m 05s` or `1h 07m`. Low, Sonar 2. */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/**
 * Starts a progress line for `total` units of work. Each call of the returned function marks
 * one unit done; a plain line with percent, elapsed and time left prints every ten seconds,
 * and once at the end. Low, Sonar 1.
 */
export function startProgress(label: string, total: number): () => void {
  const started = performance.now();
  let done = 0;
  let printed = started;

  console.log(`${label}: ${String(total)} to go`);
  return () => {
    done += 1;
    const now = performance.now();
    if (now - printed < PRINT_EVERY_MS && done < total) return;
    printed = now;
    const elapsed = now - started;
    const left = done === 0
      ? 0
      : (elapsed / done) * (total - done);
    console.log(done === total
      ? `${label}: done, ${String(total)} in ${formatDuration(elapsed)}`
      : `${label}: ${String(done)}/${String(total)} (${String(Math.round((done / total) * 100))}%), ${formatDuration(elapsed)} elapsed, about ${formatDuration(left)} left`);
  };
}
