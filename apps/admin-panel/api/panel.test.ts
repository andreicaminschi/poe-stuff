import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { tempLake, type TempLake } from "./util/temp-lake.test-helpers.ts";

type Result = { ok: boolean; log: string };
const buildCatalog = jest.fn<(repo: string, league: string, force: readonly string[]) => Promise<Result>>();
jest.unstable_mockModule("./catalog/build.api.ts", () => ({ buildCatalog }));

const { createPanelService } = await import("./panel.ts");

const deferred = () => {
  let settle: (result: Result) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  const promise = new Promise<Result>((done, reject) => {
    settle = done;
    fail = reject;
  });
  return { promise, settle, fail };
};

describe("createPanelService", () => {
  let repo: TempLake;
  beforeEach(async () => {
    repo = await tempLake();
  });
  afterEach(() => repo.remove());

  describe("buildCatalog", () => {
    it("turns away a second build while the first is still running", async () => {
      const first = deferred();
      buildCatalog.mockReturnValueOnce(first.promise);
      const panel = createPanelService(repo.root, repo.root, async () => undefined);

      const running = panel.buildCatalog("Allflame", []);
      const second = await panel.buildCatalog("Allflame", []);
      first.settle({ ok: true, log: "built" });

      expect(second).toEqual({ ok: false, log: "A build is already running." });
      await expect(running).resolves.toEqual({ ok: true, log: "built" });
      expect(buildCatalog).toHaveBeenCalledTimes(1);
    });

    it("accepts a new build once the previous one has failed", async () => {
      buildCatalog.mockRejectedValueOnce(new Error("spawn failed"));
      buildCatalog.mockResolvedValueOnce({ ok: true, log: "" });
      const panel = createPanelService(repo.root, repo.root, async () => undefined);

      await expect(panel.buildCatalog("Allflame", [])).rejects.toThrow("spawn failed");

      await expect(panel.buildCatalog("Allflame", ["taxonomy"])).resolves.toEqual({ ok: true, log: "" });
      expect(buildCatalog).toHaveBeenLastCalledWith(repo.root, "Allflame", ["taxonomy"]);
    });

    it("guards each panel separately", async () => {
      buildCatalog.mockReturnValueOnce(deferred().promise).mockResolvedValueOnce({ ok: true, log: "" });

      void createPanelService(repo.root, repo.root, async () => undefined).buildCatalog("Allflame", []);
      const other = await createPanelService(repo.root, repo.root, async () => undefined).buildCatalog("Allflame", []);

      expect(other).toEqual({ ok: true, log: "" });
    }); // guard is per service, not per process
  });

  it("reads the lake under the repo's .s3 folder", async () => {
    const panel = createPanelService(repo.root, repo.root, async () => undefined);

    await expect(panel.getVersions()).resolves.toEqual({ versions: [] });
  });
});
