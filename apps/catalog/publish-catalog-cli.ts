import { createLakeService } from "@poe/lake/service";
import { publishCatalog } from "./publish-catalog.ts";
import { hourFromDate, parseHour, runId } from "./run-id.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

function chooseHour(args: readonly string[]): number {
  const date = flag(args, "date");
  const hour = flag(args, "hour");

  if (date !== undefined && hour !== undefined) throw new Error("Pass --date or --hour, not both");
  if (date !== undefined) return hourFromDate(date);
  if (hour !== undefined) return parseHour(hour);

  throw new Error("Pass --hour=<unix seconds> or --date=YYYY-MM-DD-HH");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const league = flag(args, "league");

  if (league === undefined) throw new Error("Pass --league=<name>");

  const id = runId(league, chooseHour(args));
  const lake = createLakeService({ root: flag(args, "root") });

  for (const key of await publishCatalog(lake, id, league)) {
    process.stdout.write(`published ${id} -> ${key}\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
