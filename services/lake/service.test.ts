import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "./service.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lake-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("createLakeService", () => {
  describe("writing and reading", () => {
    it("reads back exactly what was written under a nested key", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("a/b/c.json", { x: [1, 2] });

      expect(await lake.readJson("a/b/c.json")).toEqual({ x: [1, 2] });
    });

    it("stores the value as two-space JSON ending in a newline", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("k.json", { a: 1 });

      expect(await readFile(join(root, "k.json"), "utf8")).toBe('{\n  "a": 1\n}\n');
    });

    it("overwrites a key that already holds a value", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("k.json", 1);
      await lake.writeJson("k.json", 2);

      expect(await lake.readJson("k.json")).toBe(2);
    });

    it("rejects when reading a key nobody wrote", async () => {
      const lake = createLakeService({ root });

      await expect(lake.readJson("missing.json")).rejects.toThrow();
    });
  });

  describe("writing atomically", () => {
    it("leaves only the final file behind, with no temporary sibling", async () => {
      const lake = createLakeService({ root });

      await lake.writeJsonAtomic("d/k.json", { a: 1 });

      expect(await readdir(join(root, "d"))).toEqual(["k.json"]);
      expect(await lake.readJson("d/k.json")).toEqual({ a: 1 });
    });

    it("replaces a value that is already there", async () => {
      const lake = createLakeService({ root });

      await lake.writeJsonAtomic("k.json", 1);
      await lake.writeJsonAtomic("k.json", 2);

      expect(await lake.readJson("k.json")).toBe(2);
    });
  });

  describe("checking existence", () => {
    it("says a written key exists and an unwritten one does not", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("k.json", 1);

      expect(await lake.exists("k.json")).toBe(true);
      expect(await lake.exists("nope.json")).toBe(false);
    });

    it("says a folder prefix exists too", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("dir/k.json", 1);

      expect(await lake.exists("dir")).toBe(true); // access() accepts directories
    });
  });

  describe("listing", () => {
    it("lists the direct children of a prefix, files and folders alike", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("p/a.json", 1);
      await lake.writeJson("p/sub/b.json", 1);

      expect([...(await lake.list("p"))].sort()).toEqual(["a.json", "sub"]);
    });

    it("answers an empty list for a prefix that does not exist", async () => {
      const lake = createLakeService({ root });

      expect(await lake.list("ghost")).toEqual([]);
    });

    it("answers an empty list when the prefix is a file rather than a folder", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("f.json", 1);

      expect(await lake.list("f.json")).toEqual([]); // readdir error swallowed
    });
  });

  describe("clearing", () => {
    it("removes a whole prefix and everything under it", async () => {
      const lake = createLakeService({ root });
      await lake.writeJson("p/a.json", 1);
      await lake.writeJson("p/sub/b.json", 1);

      await lake.clear("p");

      expect(await lake.exists("p")).toBe(false);
    });

    it("does nothing and does not fail when the prefix is absent", async () => {
      const lake = createLakeService({ root });

      await expect(lake.clear("ghost")).resolves.toBeUndefined();
    });
  });
});
