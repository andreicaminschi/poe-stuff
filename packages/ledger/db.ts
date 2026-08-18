import pg from "pg";
import { requireEnv } from "@util/core/env";

/**
 * One pool for the process, built the first time something asks for it. Lazy on purpose:
 * `requireEnv` should throw where a query is made, not at import, so a command that never
 * touches the ledger runs without `DATABASE_URL`.
 */
let shared: pg.Pool | undefined;

export function db(): pg.Pool {
  shared ??= new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });

  return shared;
}

/** Lets a process exit. Nothing else in the package closes the pool. */
export async function closeDb(): Promise<void> {
  const pool = shared;
  shared = undefined;
  await pool?.end();
}

/**
 * Runs `work` inside one transaction on one client. A throw rolls the whole thing back,
 * which is what makes the page-row insert able to reject a second search outright: the
 * loser's rows never exist, not even briefly.
 */
export async function transaction<T>(
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db().connect();

  try {
    await client.query("begin");
    const answer = await work(client);
    await client.query("commit");

    return answer;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
