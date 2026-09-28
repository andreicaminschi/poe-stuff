import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createLakeService } from "@poe/lake/service";
import { join } from "node:path";
import { tempLake, type TempLake } from "./util/temp-lake.test-helpers.ts";

type Result = { ok: boolean; log: string };
const buildCatalog = jest.fn<(repo: string, league: string, force: readonly string[]) => Promise<Result>>();
jest.unstable_mockModule("./catalog/build.api.ts", () => ({ buildCatalog }));

const { createPanelService } = await import("./panel.ts");

const deferred = () => {
  let settle: (result: Result) => void = () => undefined;
  const promise = new Promise<Result>((done) => {
    settle = done;
  });
  return { promise, settle };
};

describe("createPanelService", () => {
  let repo: TempLake;
  beforeEach(async () => {
    repo = await tempLake();
    buildCatalog.mockReset();
  });
  afterEach(() => repo.remove());

  const panelOf = () => createPanelService(repo.root, repo.root, async () => undefined);

  describe("buildCatalog", () => {
    it("turns away a second build while the first is still running", async () => {
      buildCatalog.mockReturnValueOnce(deferred().promise);
      const panel = panelOf();

      void panel.buildCatalog("Allflame", []);
      const second = await panel.buildCatalog("Allflame", []);

      expect(second).toEqual({ ok: false, log: "A build is already running." });
      expect(buildCatalog).toHaveBeenCalledTimes(1);
    }); // the flag is set before the first await

    it("answers the first build's own result once it finishes", async () => {
      const first = deferred();
      buildCatalog.mockReturnValueOnce(first.promise);
      const panel = panelOf();

      const running = panel.buildCatalog("Allflame", []);
      first.settle({ ok: true, log: "built" });

      await expect(running).resolves.toEqual({ ok: true, log: "built" });
    });

    it("accepts a new build once the previous one has finished", async () => {
      buildCatalog.mockResolvedValueOnce({ ok: false, log: "first" }).mockResolvedValueOnce({ ok: true, log: "again" });
      const panel = panelOf();

      await panel.buildCatalog("Allflame", []);
      const again = await panel.buildCatalog("Allflame", ["taxonomy"]);

      expect(again).toEqual({ ok: true, log: "again" });
    }); // a failed exit code still releases the guard

    it("accepts a new build once the previous one threw", async () => {
      buildCatalog.mockRejectedValueOnce(new Error("spawn failed")).mockResolvedValueOnce({ ok: true, log: "" });
      const panel = panelOf();

      await expect(panel.buildCatalog("Allflame", [])).rejects.toThrow("spawn failed");
      const again = await panel.buildCatalog("Allflame", ["taxonomy"]);

      expect(again).toEqual({ ok: true, log: "" });
      expect(buildCatalog).toHaveBeenLastCalledWith(repo.root, "Allflame", ["taxonomy"]);
    }); // released in finally, or the panel locks for good

    it("guards each panel separately", async () => {
      buildCatalog.mockReturnValueOnce(deferred().promise).mockResolvedValueOnce({ ok: true, log: "" });

      void panelOf().buildCatalog("Allflame", []);
      const other = await panelOf().buildCatalog("Allflame", []);

      expect(other).toEqual({ ok: true, log: "" });
    }); // guard is per service, not per process
  });

  it("reads the taxonomy from the lake in the repo's .s3 folder", async () => {
    await createLakeService({ root: join(repo.root, ".s3") }).writeJson("taxonomy/registry.json", {
      next: 2,
      versions: { "3.29.1": { state: "draft", createdAt: "2026-01-01T00:00:00Z" } },
    });

    const list = await panelOf().getVersions();

    expect(list.versions.map((version) => version.id)).toEqual(["3.29.1"]);
  }); // not the repo root itself
});
