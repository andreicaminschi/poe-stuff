import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { buildCatalog } = await import("./build.api.ts");

describe("buildCatalog", () => {
  it("builds the league without a force flag when no source is forced", async () => {
    await buildCatalog("/repo", "Allflame", []);

    expect(runAction).toHaveBeenCalledWith("/repo", ["catalog", "--league=Allflame"]);
  });

  it("names every forced source in one comma-joined flag", async () => {
    await buildCatalog("/repo", "Allflame", ["taxonomy", "poewatch"]);

    expect(runAction).toHaveBeenCalledWith("/repo", ["catalog", "--league=Allflame", "--force=taxonomy,poewatch"]);
  });
});
