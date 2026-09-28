import { afterEach, beforeEach, describe, it, expect } from "@jest/globals";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileCache } from "./create-file-cache.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "file-cache-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("createFileCache", () => {
  describe("reading", () => {
    it("misses when nothing was stored under the key", async () => {
      const cache = createFileCache(root);

      const value = await cache.get("absent");

      expect(value).toBeUndefined(); // ENOENT swallowed
    });

    it("misses when the cache folder does not exist yet", async () => {
      const cache = createFileCache(join(root, "nope"));

      const value = await cache.get("k");

      expect(value).toBeUndefined(); // missing parent is also ENOENT
    });

    it("throws on a stored file that is not valid JSON", async () => {
      await writeFile(join(root, "bad.json"), "{not json", "utf8");

      const read = createFileCache(root).get("bad");

      await expect(read).rejects.toThrow(SyntaxError); // corruption is not a miss
    });

    it("throws when the key's file turns out to be a folder", async () => {
      await mkdir(join(root, "dir.json"));

      const read = createFileCache(root).get("dir");

      await expect(read).rejects.toMatchObject({ code: expect.stringMatching(/EISDIR|EPERM|EACCES/) }); // only ENOENT is a miss
    });

    it("returns a stored null as null rather than as a miss", async () => {
      const cache = createFileCache<null>(root);
      await cache.set("n", null);

      const value = await cache.get("n");

      expect(value).toBeNull(); // null is valid JSON
    });

    it("refuses to read a key that climbs out with two dots", async () => {
      const cache = createFileCache<number>(root);

      const read = cache.get("..");

      await expect(read).rejects.toThrow("is not a single file name"); // checked before the read
    });
  });

  describe("writing", () => {
    it("stores the value as JSON in a file named after the key and reads it back", async () => {
      const cache = createFileCache<{ a: number[] }>(root);

      await cache.set("k", { a: [1, 2] });

      expect(await cache.get("k")).toEqual({ a: [1, 2] });
      expect(await readFile(join(root, "k.json"), "utf8")).toBe("{\"a\":[1,2]}"); // compact, no pretty-print
    });

    it("replaces the earlier value when the same key is written twice", async () => {
      const cache = createFileCache<number>(root);
      await cache.set("k", 1);

      await cache.set("k", 2);

      expect(await cache.get("k")).toBe(2); // rename over the old file
    });

    it("creates the cache folder on the first write", async () => {
      const cache = createFileCache<string>(join(root, "deep"));

      await cache.set("b", "v");

      expect(await readFile(join(root, "deep", "b.json"), "utf8")).toBe("\"v\""); // mkdir recursive
    });

    it("refuses a key with a slash in it", async () => {
      const cache = createFileCache<number>(join(root, "inner"));

      const write = cache.set("a/b", 1);

      await expect(write).rejects.toThrow("is not a single file name"); // would nest a folder
    });

    it("refuses a key that climbs out of the cache folder", async () => {
      const cache = createFileCache<number>(join(root, "inner"));

      const write = cache.set("../escaped", 1);

      await expect(write).rejects.toThrow("is not a single file name"); // path traversal
    });

    it("refuses an empty key", async () => {
      const cache = createFileCache<number>(root);

      const write = cache.set("", 1);

      await expect(write).rejects.toThrow("is not a single file name"); // would write ".json"
    });

    it("drops what JSON cannot hold, so a date comes back as a string and an undefined field vanishes", async () => {
      const cache = createFileCache<{ d: Date | string; u?: undefined }>(root);

      await cache.set("k", { d: new Date(0), u: undefined });

      expect(await cache.get("k")).toEqual({ d: "1970-01-01T00:00:00.000Z" }); // plain JSON.stringify
    });

    it("throws when asked to store undefined itself", async () => {
      const write = createFileCache<undefined>(root).set("k", undefined);

      await expect(write).rejects.toThrow("which JSON cannot hold"); // stringify would write nothing
    });
  });
});
