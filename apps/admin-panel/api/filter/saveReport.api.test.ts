import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UnfilteredReport } from "@poe/filter-validate/types";
import { tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { saveReport } from "./saveReport.api.ts";

const report: UnfilteredReport = {
  sampled: 2,
  unfiltered: 2,
  unsampled: [],
  rows: [
    {
      key: "k",
      name: "Chaos Orb",
      category: "currency",
      subcategory: null,
      samples: [{}, { Corrupted: true }],
    },
  ],
};

describe("saveReport", () => {
  let folder: TempLake;
  beforeEach(async () => {
    folder = await tempLake();
  });
  afterEach(() => folder.remove());

  it("writes nothing and answers cancelled when no path is chosen", async () => {
    await expect(saveReport(report, async () => undefined)).resolves.toEqual({ cancelled: true });
  });

  it("writes the CSV and one query per sample beside it, with Windows line endings", async () => {
    const path = join(folder.root, "report.csv");

    const saved = await saveReport(report, async () => path);

    const queries = join(folder.root, "report.queries.txt");
    expect(saved).toEqual({ path, queries });
    await expect(readFile(queries, "utf8")).resolves.toBe("Chaos Orb\r\nChaos Orb, corrupted\r\n");
    await expect(readFile(path, "utf8")).resolves.toContain("\r\n");
  });

  it("names the queries file after a path of any case ending in .csv", async () => {
    const saved = await saveReport(report, async () => join(folder.root, "Report.CSV"));

    expect(saved).toMatchObject({ queries: join(folder.root, "Report.queries.txt") });
  });

  it("appends the queries suffix to a path that does not end in .csv", async () => {
    const saved = await saveReport(report, async () => join(folder.root, "report"));

    await expect(access(join(folder.root, "report.queries.txt"))).resolves.toBeUndefined();
    expect(saved).toMatchObject({ path: join(folder.root, "report") });
  });

  it("writes an empty queries file when nothing was unfiltered", async () => {
    await saveReport({ ...report, rows: [] }, async () => join(folder.root, "r.csv"));

    await expect(readFile(join(folder.root, "r.queries.txt"), "utf8")).resolves.toBe("");
  });
});
