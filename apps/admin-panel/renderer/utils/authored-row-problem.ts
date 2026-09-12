import { slug } from "./slug.ts";

export function authoredRowProblem({
  name,
  baseType,
  key,
  taken,
  reason,
}: {
  readonly name: string;
  readonly baseType: string;
  readonly key: string;
  readonly taken: boolean;
  readonly reason: string;
}): string | undefined {
  if (slug(name) === "") return "Give it a name.";
  if (baseType.trim() === "") return "Give it a base type: what a filter writes for it.";
  if (taken) return `${key} already exists.`;
  if (reason.trim() === "") return "Say why. A row with no reason records that somebody decided, not what.";

  return undefined;
}
