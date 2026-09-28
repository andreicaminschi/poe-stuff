import { afterEach, beforeEach, describe, it, expect } from "@jest/globals";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileCache } from "./file-cache.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "file-cache-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("fileCache", () => {
  describe("get", () => {
    it("misses with undefined when nothing was stored under the key", async () => {
      expect(await fileCache(root).get("absent")).toBeUndefined();
    });

    it("misses when the root folder does not exist yet", async () => {
      expect(await fileCache(join(root, "nope")).get("k")).toBeUndefined();
    });

    it("throws on a file that holds invalid JSON", async () => {
      await writeFile(join(root, "bad.json"), "{not json", "utf8");

      await expect(fileCache(root).get("bad")).rejects.toThrow(SyntaxError);
    });

    it("throws a real error when the key names a folder", async () => {
      await mkdir(join(root, "dir.json"));

      await expect(fileCache(root).get("dir")).rejects.toMatchObject({
        code: expect.stringMatching(/EISDIR|EPERM|EACCES/),
      });
    });

    it("returns null for a stored null, distinct from a miss", async () => {
      const cache = fileCache<null>(root);
      await cache.set("n", null);

      expect(await cache.get("n")).toBeNull();
    });
  });

  describe("set", () => {
    it("round-trips a value through a JSON file named after the key", async () => {
      const cache = fileCache<{ a: number[] }>(root);

      await cache.set("k", { a: [1, 2] });

      expect(await cache.get("k")).toEqual({ a: [1, 2] });
      expect(await readFile(join(root, "k.json"), "utf8")).toBe("{\"a\":[1,2]}");
    });

    it("overwrites the previous value under the same key", async () => {
      const cache = fileCache<number>(root);
      await cache.set("k", 1);

      await cache.set("k", 2);

      expect(await cache.get("k")).toBe(2);
    });

    it("creates a missing root folder", async () => {
      const cache = fileCache<string>(join(root, "deep"));

      await cache.set("b", "v");

      expect(await readFile(join(root, "deep", "b.json"), "utf8")).toBe("\"v\"");
    });

    it("refuses a key with a slash or one that climbs with dot-dot", async () => {
      const cache = fileCache<number>(join(root, "inner"));

      await expect(cache.set("a/b", 1)).rejects.toThrow("is not a single file name");
      await expect(cache.set("../escaped", 1)).rejects.toThrow("is not a single file name");
    });

    it("drops what JSON cannot hold, so a Date comes back as a string", async () => {
      const cache = fileCache<{ d: Date | string; u?: undefined }>(root);

      await cache.set("k", { d: new Date(0), u: undefined });

      expect(await cache.get("k")).toEqual({ d: "1970-01-01T00:00:00.000Z" });
    });

    it("throws when asked to store undefined", async () => {
      await expect(fileCache<undefined>(root).set("k", undefined)).rejects.toThrow("which JSON cannot hold");
    });
  });
});
