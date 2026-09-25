import { groupUnfiltered } from "./group-unfiltered.ts";
import type { UnfilteredReport } from "./types.ts";

const ROW_COLUMNS = ["Category", "Subcategory", "Row", "Key"];

const cellValue = (value: unknown): string => {
  if (value === undefined) return "";
  if (!Array.isArray(value)) return String(value);
  return value.length === 0 ? "None" : value.join(" ");
};

const escape = (cell: string): string => (/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell);

/**
 * The report as CSV: one line per unfiltered sample. The property columns are every
 * property any sample carries, in the order first seen.
 */
export function reportCsv(report: UnfilteredReport): string {
  const groups = groupUnfiltered(report.rows);

  const properties = new Set<string>();
  for (const group of groups) for (const row of group.rows) for (const item of row.samples) for (const name of Object.keys(item)) properties.add(name);
  const columns = [...properties];

  const lines = [[...ROW_COLUMNS, ...columns].map(escape).join(",")];
  for (const group of groups) {
    for (const row of group.rows) {
      const lead = [row.category, row.subcategory ?? "", row.name, row.key];
      for (const item of row.samples) {
        const values = columns.map((name) => cellValue((item as Record<string, unknown>)[name]));
        lines.push([...lead, ...values].map(escape).join(","));
      }
    }
  }

  return `${lines.join("\r\n")}\r\n`;
}
