import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "./service.ts";
import type { Lake } from "./types.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lake-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("createLakeService", () => {
  it("reads back what it wrote, creating folders on the way", async () => {
    await lake.writeJson("a/b/c.json", { x: 1 });

    expect(await lake.readJson("a/b/c.json")).toEqual({ x: 1 });
  });

  it("says whether a key exists", async () => {
    expect(await lake.exists("a.json")).toBe(false);
    await lake.writeJson("a.json", {});
    expect(await lake.exists("a.json")).toBe(true);
  });

  it("rejects a read of a key that is not there", async () => {
    await expect(lake.readJson("missing.json")).rejects.toThrow();
  });

  it("leaves no temp file behind after an atomic write", async () => {
    await lake.writeJsonAtomic("dir/a.json", { x: 1 });
    await lake.writeJsonAtomic("dir/a.json", { x: 2 });

    expect(await readdir(join(root, "dir"))).toEqual(["a.json"]);
    expect(await lake.readJson("dir/a.json")).toEqual({ x: 2 });
  });

  it("lists what sits under a prefix, and nothing for a missing one", async () => {
    await lake.writeJson("runs/one.json", {});
    await lake.writeJson("runs/two.json", {});

    expect([...(await lake.list("runs"))].sort()).toEqual(["one.json", "two.json"]);
    expect(await lake.list("nowhere")).toEqual([]);
  });

  it("clears a prefix, and answers quietly when there is nothing there", async () => {
    await lake.writeJson("gold/a.json", {});
    await lake.clear("gold");

    expect(await lake.exists("gold/a.json")).toBe(false);
    await expect(lake.clear("nowhere")).resolves.toBeUndefined();
  });
});
