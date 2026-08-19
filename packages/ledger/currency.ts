import { db, transaction } from "./db.ts";
import type { CurrencyHourRow, HourOutcome } from "./types.ts";

const COLUMNS = `hour_id, league, state, attempts, object_key, market_count,
  duration_ms, error, http_status, fetched_at, updated_at`;

/** `hour_id` is a bigint, which pg hands back as a string. */
const asRow = (row: CurrencyHourRow): CurrencyHourRow => ({
  ...row,
  hour_id: Number(row.hour_id),
});

/**
 * The hours in `[fromHour, untilHour]` this league still owes, written as `pending` and
 * handed back to be queued.
 *
 * The insert and the read are one transaction, so two sweeps running at once cannot both
 * open the same hour. What comes back is every hour in the range that is not settled —
 * including ones a previous sweep wrote rows for but died before queueing. Re-queueing an
 * hour that is already waiting costs nothing: the job id is the hour, and redis keeps one.
 *
 * A `failed` row is taken again, because a sweep is also the repair pass — unless the
 * failure was the endpoint saying no. A 404 is an hour GGG has pruned or never had, and
 * retrying it every hour forever is the one shape this must not take. 408 and 429 are
 * back-pressure rather than an answer, so those stay eligible.
 */
export async function openHours(
  league: string,
  fromHour: number,
  untilHour: number,
): Promise<number[]> {
  if (untilHour < fromHour) return [];

  return transaction(async (client) => {
    await client.query(
      `insert into currency_hour (hour_id, league, state)
       select hour, $1, 'pending'
         from generate_series($2::bigint, $3::bigint, 3600) as hour
       on conflict (league, hour_id) do update
          set state = 'pending', error = null, http_status = null, updated_at = now()
        where currency_hour.state = 'failed'
          and (currency_hour.http_status is null
               or currency_hour.http_status not between 400 and 499
               or currency_hour.http_status in (408, 429))`,
      [league, fromHour, untilHour],
    );

    const { rows } = await client.query<{ hour_id: string }>(
      `select hour_id from currency_hour
        where league = $1
          and hour_id between $2 and $3
          and state in ('pending', 'active')
        order by hour_id`,
      [league, fromHour, untilHour],
    );

    return rows.map((row) => Number(row.hour_id));
  });
}

/**
 * Takes ownership of an hour, or hands back nothing where the row has already settled —
 * an hour queued twice is collected once. An `active` row can still be claimed: that is
 * a stalled job coming back to a new worker.
 */
export async function claimHour(
  league: string,
  hourId: number,
): Promise<CurrencyHourRow | undefined> {
  const { rows } = await db().query<CurrencyHourRow>(
    `update currency_hour
        set state = 'active', attempts = attempts + 1, updated_at = now()
      where league = $1 and hour_id = $2 and state in ('pending', 'active')
      returning ${COLUMNS}`,
    [league, hourId],
  );

  return rows[0] === undefined ? undefined : asRow(rows[0]);
}

/**
 * Writes how an hour ended. A settled row is left alone, so a worker whose lock was
 * taken away cannot overwrite the answer already recorded.
 */
export async function settleHour(
  league: string,
  hourId: number,
  outcome: HourOutcome,
): Promise<boolean> {
  const done = outcome.state === "done";

  const { rowCount } = await db().query(
    `update currency_hour
        set state        = $3,
            error        = $4,
            http_status  = $5,
            object_key   = coalesce($6, object_key),
            market_count = coalesce($7, market_count),
            duration_ms  = coalesce($8, duration_ms),
            fetched_at   = coalesce($9, fetched_at),
            updated_at   = now()
      where league = $1 and hour_id = $2 and state not in ('done', 'failed')`,
    [
      league,
      hourId,
      outcome.state,
      done ? null : outcome.error,
      done ? null : (outcome.http_status ?? null),
      done ? (outcome.object_key ?? null) : null,
      done ? (outcome.market_count ?? null) : null,
      done ? (outcome.duration_ms ?? null) : null,
      done ? (outcome.fetched_at ?? null) : null,
    ],
  );

  return (rowCount ?? 0) > 0;
}

/** How much of a league's history is collected, by state. What the CLI reports. */
export async function hourCounts(
  league: string,
): Promise<Record<string, number>> {
  const { rows } = await db().query<{ state: string; count: string }>(
    `select state, count(*) as count from currency_hour
      where league = $1 group by state`,
    [league],
  );

  return Object.fromEntries(rows.map((row) => [row.state, Number(row.count)]));
}
