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

const text = "Show\n  BaseType == \"Mirror\"\n";

describe("saveFilter", () => {
  it("answers with the path the person picked", async () => {
    const path = join(root, "mine.filter");

    const saved = await saveFilter(text, async () => path);

    expect(saved).toEqual({ path });
  }); // the window shows where it went

  it("writes the filter text byte for byte to the picked path", async () => {
    const path = join(root, "mine.filter");

    await saveFilter(text, async () => path);

    expect(await readFile(path, "utf8")).toBe(text);
  }); // no trailing newline added or stripped

  it("reports a cancel when the person closes the picker without choosing", async () => {
    const saved = await saveFilter("Show", async () => undefined);

    expect(saved).toEqual({ cancelled: true });
  }); // undefined path is a cancel, not an error

  it("writes no file when the person cancels", async () => {
    await saveFilter("Show", async () => undefined);

    expect(await readdir(root)).toEqual([]);
  }); // returns before writeFile

  it("fails when the picked folder does not exist", async () => {
    const saving = saveFilter("Show", async () => join(root, "missing", "a.filter"));

    await expect(saving).rejects.toThrow();
  }); // no mkdir, the picker only offers real folders
});
