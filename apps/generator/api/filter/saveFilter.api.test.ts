import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveFilter } from "./saveFilter.api.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "generator-filter-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("saveFilter", () => {
  it("writes the text to the picked path and answers with that path", async () => {
    const path = join(root, "mine.filter");

    const saved = await saveFilter("Show\n  BaseType == \"Mirror\"\n", async () => path);

    expect(saved).toEqual({ path });
    expect(await readFile(path, "utf8")).toBe("Show\n  BaseType == \"Mirror\"\n");
  });

  it("writes nothing and reports a cancel when no path is picked", async () => {
    const saved = await saveFilter("Show", async () => undefined);

    expect(saved).toEqual({ cancelled: true });
    expect(await readdir(root)).toEqual([]);
  });

  it("rejects when the picked folder does not exist", async () => {
    await expect(saveFilter("Show", async () => join(root, "missing", "a.filter"))).rejects.toThrow();
  });
});
