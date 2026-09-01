import { slug } from "./lake/keys.ts";

const HOUR_SECONDS = 3_600;
const HOUR_MS = 3_600_000;

/** `YYYY-MM-DD-HH`, which is what the CLI takes and never what a key holds. */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})$/;

/**
 * The id of a run: a league and the hour it collected, joined by the field separator.
 *
 * The hour is the raw id rather than a readable date, so nothing has to agree on a format
 * to address the same run. `run=` is the key's business and is added in `lake/keys.ts`.
 */
export const runId = (league: string, hourId: number): string =>
  `${slug(league)}_${hourId}`;

/**
 * The last hour the exchange has published.
 *
 * The hour now running is not published until it ends — asking for it answers `404` — so
 * the default can never be the current hour.
 */
export const previousHour = (nowMs: number = Date.now()): number =>
  Math.floor(nowMs / HOUR_MS) * HOUR_SECONDS - HOUR_SECONDS;

/**
 * `2025-12-12-01` to the hour id it names, read as UTC.
 *
 * Never local time: a machine on a clock that shifts would ask for a different hour than
 * the one that produced the run being replayed.
 */
export function hourFromDate(date: string): number {
  const match = DATE_PATTERN.exec(date);
  if (match === null) {
    throw new Error(`Expected a date of the form YYYY-MM-DD-HH, got "${date}"`);
  }

  const [, year, month, day, hour] = match;
  const ms = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
  );

  if (Number.isNaN(ms)) throw new Error(`"${date}" is not a real date`);

  return ms / 1_000;
}

/** The hour id back as `YYYY-MM-DD-HH`, for anything a person reads. */
export const dateFromHour = (hourId: number): string =>
  new Date(hourId * 1_000).toISOString().slice(0, 13).replace("T", "-");

/**
 * An hour id off the command line, checked.
 *
 * An id that does not sit on the hour is not a slow answer, it is a `401` — the CDN
 * publishes one file per hour and nothing in between.
 */
export function parseHour(value: string): number {
  const hourId = Number(value);

  if (!Number.isInteger(hourId) || hourId <= 0) {
    throw new Error(`Expected an hour id in unix seconds, got "${value}"`);
  }
  if (hourId % HOUR_SECONDS !== 0) {
    throw new Error(`Hour ${hourId} does not sit on the hour`);
  }

  return hourId;
}
