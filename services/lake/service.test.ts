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
    it("reads back exactly what was written under a key three folders deep", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("a/b/c.json", { x: [1, 2] });

      expect(await lake.readJson("a/b/c.json")).toEqual({ x: [1, 2] });
    }); // missing folders are created on write

    it("stores the value as two-space JSON ending in a newline", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("k.json", { a: 1 });

      expect(await readFile(join(root, "k.json"), "utf8")).toBe("{\n  \"a\": 1\n}\n");
    }); // the file is meant to be opened in an editor

    it("replaces a value that is already there", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("k.json", 1);
      await lake.writeJson("k.json", 2);

      expect(await lake.readJson("k.json")).toBe(2);
    }); // no append, no versioning

    it("fails when reading a key nobody wrote", async () => {
      const lake = createLakeService({ root });

      const read = lake.readJson("missing.json");

      await expect(read).rejects.toThrow();
    }); // ENOENT reaches the caller
  });

  describe("refusing keys outside the root", () => {
    it("refuses to write a key that climbs one folder above the root", async () => {
      const lake = createLakeService({ root });

      const write = () => lake.writeJson("../escape.json", 1);

      expect(write).toThrow("Lake key escapes root: ../escape.json");
    }); // throws synchronously, before any promise exists

    it("allows a key that climbs out and back into the root", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("a/../b.json", 1);

      expect(await lake.readJson("b.json")).toBe(1);
    }); // only the resolved path counts
  });

  describe("writing atomically", () => {
    it("leaves only the final file behind, with no temporary sibling", async () => {
      const lake = createLakeService({ root });

      await lake.writeJsonAtomic("d/k.json", { a: 1 });

      expect(await readdir(join(root, "d"))).toEqual(["k.json"]);
      expect(await lake.readJson("d/k.json")).toEqual({ a: 1 });
    }); // temp file is renamed over the target

    it("replaces a value that is already there", async () => {
      const lake = createLakeService({ root });

      await lake.writeJsonAtomic("k.json", 1);
      await lake.writeJsonAtomic("k.json", 2);

      expect(await lake.readJson("k.json")).toBe(2);
    }); // rename overwrites

    it("lands every one of ten parallel writes to one key without leaving a temporary file", async () => {
      const lake = createLakeService({ root });

      await Promise.all(Array.from({ length: 10 }, (_, n) => lake.writeJsonAtomic("k.json", n)));

      expect(await readdir(root)).toEqual(["k.json"]);
      expect(await lake.readJson<number>("k.json")).toBeGreaterThanOrEqual(0);
    }); // each writer has its own uuid temp name
  });

  describe("checking existence", () => {
    it("says a written key exists", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("k.json", 1);

      expect(await lake.exists("k.json")).toBe(true);
    }); // readable, not just present

    it("says a key nobody wrote does not exist, without failing", async () => {
      const lake = createLakeService({ root });

      const exists = await lake.exists("nope.json");

      expect(exists).toBe(false);
    }); // access error swallowed

    it("says a folder prefix exists too", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("dir/k.json", 1);

      expect(await lake.exists("dir")).toBe(true);
    }); // access() accepts directories
  });

  describe("listing", () => {
    it("lists the direct children of a prefix, files and folders alike", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("p/a.json", 1);
      await lake.writeJson("p/sub/b.json", 1);

      expect([...(await lake.list("p"))].sort()).toEqual(["a.json", "sub"]);
    }); // one level, not recursive

    it("answers an empty list for a prefix that does not exist", async () => {
      const lake = createLakeService({ root });

      const names = await lake.list("ghost");

      expect(names).toEqual([]);
    }); // ENOENT swallowed

    it("answers an empty list when the prefix is a file rather than a folder", async () => {
      const lake = createLakeService({ root });

      await lake.writeJson("f.json", 1);

      expect(await lake.list("f.json")).toEqual([]);
    }); // ENOTDIR swallowed
  });

  describe("clearing", () => {
    it("removes a whole prefix and everything under it", async () => {
      const lake = createLakeService({ root });
      await lake.writeJson("p/a.json", 1);
      await lake.writeJson("p/sub/b.json", 1);

      await lake.clear("p");

      expect(await lake.exists("p")).toBe(false);
    }); // recursive

    it("does nothing and does not fail when the prefix is absent", async () => {
      const lake = createLakeService({ root });

      const cleared = lake.clear("ghost");

      await expect(cleared).resolves.toBeUndefined();
    }); // force: true
  });
});
