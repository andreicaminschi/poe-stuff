import { slug } from "./slug.ts";

export function authoredRowProblem({
  name,
  key,
  taken,
  reason,
}: {
  readonly name: string;
  readonly key: string;
  readonly taken: boolean;
  readonly reason: string;
}): string | undefined {
  if (slug(name) === "") return "Give it a name.";
  if (taken) return `${key} already exists.`;
  if (reason.trim() === "") return "Say why. A row with no reason records that somebody decided, not what.";

  return undefined;
}
