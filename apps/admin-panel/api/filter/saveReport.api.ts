import { writeFile } from "node:fs/promises";
import { groupUnfiltered } from "@poe/filter-validate/group-unfiltered";
import { reportCsv } from "@poe/filter-validate/report-csv";
import { sampleQuery } from "@poe/filter-validate/sample-query";
import type { UnfilteredReport } from "@poe/filter-validate/types";

export type SavedReport = { readonly path: string; readonly queries: string } | { readonly cancelled: true };

const queriesPath = (path: string): string => path.replace(/\.csv$/i, "") + ".queries.txt";

function reportQueries(report: UnfilteredReport): string {
  const lines = groupUnfiltered(report.rows).flatMap((group) =>
    group.rows.flatMap((row) => row.samples.map((item) => sampleQuery(row.name, item))),
  );
  return `${lines.join("\r\n")}\r\n`;
}

/** Writes the report as CSV, and one query per sample beside it. */
export async function saveReport(
  report: UnfilteredReport,
  choosePath: () => Promise<string | undefined>,
): Promise<SavedReport> {
  const path = await choosePath();
  if (path === undefined) return { cancelled: true };

  const queries = queriesPath(path);
  await writeFile(path, reportCsv(report), "utf8");
  await writeFile(queries, reportQueries(report), "utf8");
  return { path, queries };
}
