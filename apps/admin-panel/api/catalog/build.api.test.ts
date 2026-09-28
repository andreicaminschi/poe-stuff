import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { buildCatalog } = await import("./build.api.ts");

describe("buildCatalog", () => {
  it("builds the league with no force flag at all when no source is forced", async () => {
    await buildCatalog("/repo", "Allflame", []);

    expect(runAction).toHaveBeenLastCalledWith("/repo", ["catalog", "--league=Allflame"]);
  }); // an empty --force= would force every source

  it("forces a single source with a flag naming only that source", async () => {
    await buildCatalog("/repo", "Allflame", ["taxonomy"]);

    expect(runAction).toHaveBeenLastCalledWith("/repo", ["catalog", "--league=Allflame", "--force=taxonomy"]);
  }); // no trailing comma from the join

  it("names both forced sources in one comma-joined flag, in the order given", async () => {
    await buildCatalog("/repo", "Allflame", ["taxonomy", "poewatch"]);

    expect(runAction).toHaveBeenLastCalledWith("/repo", ["catalog", "--league=Allflame", "--force=taxonomy,poewatch"]);
  }); // one flag, not one per source
});
