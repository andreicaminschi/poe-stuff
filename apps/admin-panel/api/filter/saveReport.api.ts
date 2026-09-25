import { writeFile } from "node:fs/promises";
import { reportCsv } from "@poe/filter-validate/report-csv";
import type { UnfilteredReport } from "@poe/filter-validate/types";

export type SavedReport = { readonly path: string } | { readonly cancelled: true };

/** Writes the validation report as CSV wherever the person picks. */
export async function saveReport(
  report: UnfilteredReport,
  choosePath: () => Promise<string | undefined>,
): Promise<SavedReport> {
  const path = await choosePath();
  if (path === undefined) return { cancelled: true };

  await writeFile(path, reportCsv(report), "utf8");
  return { path };
}
