import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { DEFAULT_CONFIG } from "./config/default-config.ts";
import { createGeneratorService } from "./generator.ts";

let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "generator-service-"));
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe("createGeneratorService", () => {
  it("stores the config under the repo's .s3 folder", async () => {
    const service = createGeneratorService(repo, async () => undefined);

    await service.saveConfig(DEFAULT_CONFIG);

    expect(JSON.parse(await readFile(join(repo, ".s3", "generator", "config.json"), "utf8"))).toEqual(DEFAULT_CONFIG);
  }); // the lake root is repo/.s3, not repo

  it("reads the Allflame league's published catalog", async () => {
    const lake = createLakeService({ root: join(repo, ".s3") });
    await lake.writeJson("catalog/latest/allflame.catalog.json", []);
    await lake.writeJson("catalog/latest/allflame.catalog.categories.json", {});

    const catalog = await createGeneratorService(repo, async () => undefined).getCatalog();

    expect(catalog).toEqual({ rows: [], categories: {} });
  }); // the league is fixed, the window never names one

  it("writes the filter wherever the path picker points", async () => {
    const path = join(repo, "out.filter");

    await createGeneratorService(repo, async () => path).saveFilter("Hide");

    expect(await readFile(path, "utf8")).toBe("Hide");
  }); // the picker is asked at save time, not at construction
});
