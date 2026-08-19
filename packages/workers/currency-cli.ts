import { Queue } from "bullmq";
import { hourCounts } from "@poe/ledger/currency";
import { closeDb } from "@poe/ledger/db";
import {
  CURRENCY_LAG_HOURS,
  HOUR_SECONDS,
  currencyFromHour,
  currencyLeague,
  latestCurrencyHour,
} from "./config.ts";
import {
  CURRENCY_PATTERN,
  CURRENCY_QUEUE,
  CURRENCY_SCHEDULER,
  JOB_OPTIONS,
} from "./queues.ts";
import { redisClient } from "./redis.ts";

/**
 * The commands that drive the currency sweep. The worker collects the hours; these say
 * when it is asked to:
 *
 *     currency-cli.ts schedule
 *     currency-cli.ts unschedule
 *     currency-cli.ts sweep
 *     currency-cli.ts status
 */
const connection = redisClient();
const queue = new Queue(CURRENCY_QUEUE, { connection });

/**
 * Registers the hourly tick. The schedule lives in redis, so this is run once and the
 * machine that ran it does not have to stay up — any worker reading the `currency` queue
 * picks up the due job, and one started after a gap runs the tick it missed.
 */
async function schedule(): Promise<void> {
  await queue.upsertJobScheduler(
    CURRENCY_SCHEDULER,
    { pattern: CURRENCY_PATTERN },
    { name: CURRENCY_QUEUE, opts: JOB_OPTIONS },
  );

  console.log(`scheduled ${CURRENCY_SCHEDULER} at "${CURRENCY_PATTERN}"`);
}

/** Stops the tick. Hours already queued are still collected. */
async function unschedule(): Promise<void> {
  const removed = await queue.removeJobScheduler(CURRENCY_SCHEDULER);

  console.log(removed ? `removed ${CURRENCY_SCHEDULER}` : "nothing scheduled");
}

/** One sweep now, without waiting for the hour. What a backfill is started with. */
async function sweep(): Promise<void> {
  const job = await queue.add(CURRENCY_QUEUE, {}, JOB_OPTIONS);

  console.log(`queued sweep ${job.id ?? ""}`);
}

/** What is collected and what is still owed, against the range currently configured. */
async function status(): Promise<void> {
  const league = currencyLeague();
  const from = currencyFromHour();
  const until = latestCurrencyHour();
  const counts = await hourCounts(league);
  const wanted = Math.max(0, (until - from) / HOUR_SECONDS + 1);
  const stamp = (hour: number) => new Date(hour * 1000).toISOString();

  console.log(`${league}: ${stamp(from)} .. ${stamp(until)}`);
  console.log(
    `${wanted} hours wanted (to ${CURRENCY_LAG_HOURS}h behind the clock)`,
  );

  for (const [state, count] of Object.entries(counts)) {
    console.log(`${String(count).padStart(6)}  ${state}`);
  }
}

const [command] = process.argv.slice(2);

try {
  switch (command) {
    case "schedule":
      await schedule();
      break;
    case "unschedule":
      await unschedule();
      break;
    case "sweep":
      await sweep();
      break;
    case "status":
      await status();
      break;
    default:
      throw new Error(
        `unknown command ${command ?? ""}. Try schedule, unschedule, sweep or status`,
      );
  }
} finally {
  // Same as the cohort commands: the adds have returned, and dropping the socket is what
  // lets the process end.
  connection.disconnect();
  await closeDb();
}
