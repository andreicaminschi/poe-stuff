import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { access, readdir, readFile } from "node:fs/promises";
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

  it("writes nothing and answers cancelled when the person closes the save dialog", async () => {
    const saved = await saveReport(report, async () => undefined);

    expect(saved).toEqual({ cancelled: true });
    await expect(readdir(folder.root)).resolves.toEqual([]);
  });

  it("answers the chosen CSV path and the queries file beside it", async () => {
    const path = join(folder.root, "report.csv");

    const saved = await saveReport(report, async () => path);

    expect(saved).toEqual({ path, queries: join(folder.root, "report.queries.txt") });
  });

  it("writes one trade query per sample, two samples giving two lines with Windows line endings", async () => {
    await saveReport(report, async () => join(folder.root, "report.csv"));

    await expect(readFile(join(folder.root, "report.queries.txt"), "utf8")).resolves.toBe(
      "Chaos Orb\r\nChaos Orb, corrupted\r\n",
    );
  }); // every line ends in CRLF, the last included

  it("writes the CSV with Windows line endings", async () => {
    await saveReport(report, async () => join(folder.root, "report.csv"));

    await expect(readFile(join(folder.root, "report.csv"), "utf8")).resolves.toContain("\r\n");
  });

  it("names the queries file after a path ending in .CSV in capitals", async () => {
    const saved = await saveReport(report, async () => join(folder.root, "Report.CSV"));

    expect(saved).toMatchObject({ queries: join(folder.root, "Report.queries.txt") });
  }); // the extension match ignores case

  it("appends the queries suffix to a path that does not end in .csv", async () => {
    const saved = await saveReport(report, async () => join(folder.root, "report"));

    expect(saved).toMatchObject({ path: join(folder.root, "report") });
    await expect(access(join(folder.root, "report.queries.txt"))).resolves.toBeUndefined();
  });

  it("writes an empty queries file when nothing was unfiltered", async () => {
    await saveReport({ ...report, rows: [] }, async () => join(folder.root, "r.csv"));

    await expect(readFile(join(folder.root, "r.queries.txt"), "utf8")).resolves.toBe("");
  }); // no stray CRLF on an empty file
});
