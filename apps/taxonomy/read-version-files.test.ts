import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { SOURCE_FILES, sourceKey } from "./lake.ts";
import { readVersionFiles } from "./read-version-files.ts";

describe("readVersionFiles", () => {
  let root: string;
  let lake: Lake;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-read-"));
    lake = createLakeService({ root });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reads all six files of a version, each under its own name", async () => {
    for (const file of SOURCE_FILES) await lake.writeJson(sourceKey("3.29.1", file), { file });

    const files = await readVersionFiles(lake, "3.29.1");

    for (const file of SOURCE_FILES) expect(files[file]).toEqual({ file });
  }); // read in parallel, so a pairing mix-up would show here

  it("fails when one of the six files is missing", async () => {
    for (const file of SOURCE_FILES.slice(1)) await lake.writeJson(sourceKey("3.29.1", file), {});

    await expect(readVersionFiles(lake, "3.29.1")).rejects.toThrow();
  }); // no silent empty table for a missing file
});
