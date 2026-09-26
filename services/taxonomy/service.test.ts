import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { TaxonomyNotFoundError } from "./errors.ts";
import { createTaxonomyService } from "./service.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "taxonomy-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const rows = (version: string) => ({ version, items: {}, authored: {} });
const cats = (version: string) => ({ version, categories: {} });

describe("createTaxonomyService", () => {
  describe("reading the taxonomy", () => {
    it("reads a named version from its own file under the taxonomy prefix", async () => {
      await createLakeService({ root }).writeJson("taxonomy/3.29.4.json", rows("3.29.4"));

      const taxonomy = await createTaxonomyService({ root }).getTaxonomy("3.29.4");

      expect(taxonomy.version).toBe("3.29.4");
    });

    it("reads the promoted copy when no version is asked for", async () => {
      await createLakeService({ root }).writeJson("taxonomy/latest/taxonomy.json", rows("L"));

      expect((await createTaxonomyService({ root }).getTaxonomy()).version).toBe("L");
    });

    it("looks under a different prefix when one is given", async () => {
      await createLakeService({ root }).writeJson("other/1.json", rows("1"));

      const taxonomy = await createTaxonomyService({ root, prefix: "other" }).getTaxonomy("1");

      expect(taxonomy.version).toBe("1");
    });

    it("fails with a not-found error naming the key when the version is missing", async () => {
      const read = createTaxonomyService({ root }).getTaxonomy("9.9.9");

      await expect(read).rejects.toBeInstanceOf(TaxonomyNotFoundError);
      await expect(read).rejects.toMatchObject({ key: "taxonomy/9.9.9.json" });
    });

    it("fails with a not-found error when nothing was ever promoted", async () => {
      await expect(createTaxonomyService({ root }).getTaxonomy()).rejects.toMatchObject({
        name: "TaxonomyNotFoundError",
        key: "taxonomy/latest/taxonomy.json",
      });
    });

    it("does not validate what it reads", async () => {
      await createLakeService({ root }).writeJson("taxonomy/x.json", { junk: true });

      expect(await createTaxonomyService({ root }).getTaxonomy("x")).toEqual({ junk: true });
    });
  });

  describe("reading the categories", () => {
    it("reads a named version's category table from its own file", async () => {
      await createLakeService({ root }).writeJson("taxonomy/3.29.4.categories.json", cats("3.29.4"));

      expect((await createTaxonomyService({ root }).getCategories("3.29.4")).version).toBe("3.29.4");
    });

    it("reads the promoted category table when no version is asked for", async () => {
      await createLakeService({ root }).writeJson("taxonomy/latest/categories.json", cats("L"));

      expect((await createTaxonomyService({ root }).getCategories()).version).toBe("L");
    });

    it("does not fall back to the rows file when only the rows were published", async () => {
      await createLakeService({ root }).writeJson("taxonomy/1.json", rows("1"));

      await expect(createTaxonomyService({ root }).getCategories("1")).rejects.toMatchObject({
        key: "taxonomy/1.categories.json",
        message: "No taxonomy at taxonomy/1.categories.json",
      });
    });
  });
});
