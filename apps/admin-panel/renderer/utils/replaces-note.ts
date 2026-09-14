export function replacesNote(count: number): string {
  if (count === 0) return "No source has this row.";
  if (count === 1) return "Replaces 1 row.";

  return `Replaces ${count} rows.`;
}
