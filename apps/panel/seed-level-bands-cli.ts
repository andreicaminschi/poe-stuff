import { randomUUID } from "node:crypto";
import { createLakeService } from "@poe/lake/service";
import { createRepoeService } from "@poe/repoe/service";
import { listBandTagSeeders } from "./seed-level-bands/list-band-tag-seeders.ts";
import { runAll } from "./session.ts";
import { createVersionStore } from "./version-store.ts";

const CATEGORY = "Bases";

/** Reads `--version=3.29.6`. */
function readVersion(): string {
  const version = process.argv.find((arg) => arg.startsWith("--version="))?.slice("--version=".length);
  if (version === undefined || version === "") throw new Error("Pass --version=<draft>, such as --version=3.29.6.");
  return version;
}

/** Each released base name with its drop level, leaving out Royale rows and the pre-rework quivers. */
async function readDropLevels(): Promise<ReadonlyMap<string, number>> {
  const baseItems = await createRepoeService().getBaseItems();
  const rows = Object.entries(baseItems)
    .filter(([id, row]) => row.release_state === "released" && !id.includes("Royale") && !row.tags.includes("trade_market_legacy_item"));
  return new Map(rows.map(([, row]) => [row.name, row.drop_level]));
}

async function main(): Promise<void> {
  const version = readVersion();
  const store = createVersionStore(createLakeService({ root: ".s3" }));
  const session = await store.open(version);

  if (session.published) throw new Error(`${version} is published. Pass a draft.`);
  const { commands, unknown } = listBandTagSeeders(session.state, CATEGORY, await readDropLevels());
  const at = new Date().toISOString();
  const after = runAll(session, commands, () => ({ id: randomUUID(), at, actor: "user" }));

  await store.save(after);
  console.log(`${version}: ${String(commands.length)} band tag seeders written as WAL entries.`);
  if (unknown.length > 0) console.log(`No drop level, left untagged: ${unknown.join(", ")}`);
}

await main();
