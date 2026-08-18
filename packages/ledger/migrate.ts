import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { db, transaction } from "./db.ts";

const MIGRATIONS = join(import.meta.dirname, "migrations");

/**
 * Plain `.sql` files applied in filename order, with a table recording what has run.
 * Enough for a schema this size, and the files carry over unchanged to a real migration
 * tool the day one is worth adding.
 */
export async function migrate(): Promise<string[]> {
  await db().query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(MIGRATIONS)).filter((name) =>
    name.endsWith(".sql"),
  );
  files.sort();

  const { rows } = await db().query<{ name: string }>(
    "select name from schema_migrations",
  );
  const applied = new Set(rows.map((row) => row.name));

  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(join(MIGRATIONS, file), "utf8");

    // The file and its bookkeeping go in together: a migration that runs but is not
    // recorded would run again on the next boot and fail on its own tables.
    await transaction(async (client) => {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [
        file,
      ]);
    });

    ran.push(file);
  }

  return ran;
}
