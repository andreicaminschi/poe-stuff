export type FieldChange = { readonly field: string; readonly before: string; readonly after: string };

const SKIPPED = new Set(["key", "path", "source"]);

function shown(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;

  return JSON.stringify(value);
}

export function fieldDiff(before: object | undefined, after: object | null): readonly FieldChange[] {
  const old: Record<string, unknown> = { ...before };
  const next: Record<string, unknown> = { ...after };
  const fields = [...new Set([...Object.keys(old), ...Object.keys(next)])].filter((field) => !SKIPPED.has(field));

  return fields
    .map((field) => ({ field, before: shown(old[field]), after: shown(next[field]) }))
    .filter((change) => change.before !== change.after);
}
