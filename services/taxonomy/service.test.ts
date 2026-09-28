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
    it("reads version 3.29.4 from its own file under the taxonomy folder", async () => {
      await createLakeService({ root }).writeJson("taxonomy/3.29.4.json", rows("3.29.4"));

      const taxonomy = await createTaxonomyService({ root }).getTaxonomy("3.29.4");

      expect(taxonomy.version).toBe("3.29.4");
    }); // a version with dots is still one key

    it("reads the promoted copy when no version is asked for", async () => {
      await createLakeService({ root }).writeJson("taxonomy/latest/taxonomy.json", rows("L"));

      const taxonomy = await createTaxonomyService({ root }).getTaxonomy();

      expect(taxonomy.version).toBe("L");
    }); // latest is a real copy, not a pointer

    it("looks under a different folder when one is given", async () => {
      await createLakeService({ root }).writeJson("other/1.json", rows("1"));

      const taxonomy = await createTaxonomyService({ root, prefix: "other" }).getTaxonomy("1");

      expect(taxonomy.version).toBe("1");
    }); // prefix replaces "taxonomy"

    it("fails with a not-found error naming the file when the version was never published", async () => {
      const read = createTaxonomyService({ root }).getTaxonomy("9.9.9");

      await expect(read).rejects.toBeInstanceOf(TaxonomyNotFoundError);
      await expect(read).rejects.toMatchObject({ key: "taxonomy/9.9.9.json" });
    }); // a missing file is not a bare ENOENT

    it("fails with a not-found error when nothing was ever promoted", async () => {
      const read = createTaxonomyService({ root }).getTaxonomy();

      await expect(read).rejects.toMatchObject({
        name: "TaxonomyNotFoundError",
        key: "taxonomy/latest/taxonomy.json",
      });
    }); // fresh checkout has no latest

    it("hands back whatever the file holds without checking it", async () => {
      await createLakeService({ root }).writeJson("taxonomy/x.json", { junk: true });

      const taxonomy = await createTaxonomyService({ root }).getTaxonomy("x");

      expect(taxonomy).toEqual({ junk: true });
    }); // validates nothing, by design
  });

  describe("reading the categories", () => {
    it("reads version 3.29.4's category table from its own file", async () => {
      await createLakeService({ root }).writeJson("taxonomy/3.29.4.categories.json", cats("3.29.4"));

      const categories = await createTaxonomyService({ root }).getCategories("3.29.4");

      expect(categories.version).toBe("3.29.4");
    }); // .categories.json beside the rows

    it("reads the promoted category table when no version is asked for", async () => {
      await createLakeService({ root }).writeJson("taxonomy/latest/categories.json", cats("L"));

      const categories = await createTaxonomyService({ root }).getCategories();

      expect(categories.version).toBe("L");
    }); // latest/categories.json, not latest.categories.json

    it("fails rather than read the rows file when only the rows were published", async () => {
      await createLakeService({ root }).writeJson("taxonomy/1.json", rows("1"));

      const read = createTaxonomyService({ root }).getCategories("1");

      await expect(read).rejects.toMatchObject({
        key: "taxonomy/1.categories.json",
        message: "No taxonomy at taxonomy/1.categories.json",
      });
    }); // no fallback between the two files
  });
});
