import { closeDb } from "./db.ts";
import { migrate } from "./migrate.ts";

/**
 * Applies whatever has not been applied yet and says what it did. Safe to run against a
 * database that is already up to date — that answer is an empty list, not an error.
 */
const applied = await migrate();

console.log(
  applied.length === 0
    ? "ledger is up to date"
    : `applied ${applied.length}: ${applied.join(", ")}`,
);

await closeDb();
