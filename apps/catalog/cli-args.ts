import { hourFromDate, parseHour } from "./run-id.ts";

export const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

/** `--date` or `--hour`, never both, else the fallback. */
export function chooseHour(args: readonly string[], fallback: () => number): number {
  const date = flag(args, "date");
  const hour = flag(args, "hour");

  if (date !== undefined && hour !== undefined) throw new Error("Pass --date or --hour, not both");
  if (date !== undefined) return hourFromDate(date);
  if (hour !== undefined) return parseHour(hour);

  return fallback();
}
