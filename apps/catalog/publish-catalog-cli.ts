import { createLakeService } from "@poe/lake/service";
import { publishCatalog } from "./publish-catalog.ts";
import { chooseHour, flag } from "./cli-args.ts";
import { runId } from "./run-id.ts";

const noHour = (): never => {
  throw new Error("Pass --hour=<unix seconds> or --date=YYYY-MM-DD-HH");
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const league = flag(args, "league");

  if (league === undefined) throw new Error("Pass --league=<name>");

  const id = runId(league, chooseHour(args, noHour));
  const lake = createLakeService({ root: flag(args, "root") });

  for (const key of await publishCatalog(lake, id, league)) {
    process.stdout.write(`published ${id} -> ${key}\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error
    ? error.message
    : String(error)}\n`);
  process.exitCode = 1;
});
