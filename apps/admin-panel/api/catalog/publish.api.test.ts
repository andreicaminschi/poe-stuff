import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { publishCatalog } = await import("./publish.api.ts");

describe("publishCatalog", () => {
  it("publishes one league-hour of the catalog through yarn in the repo", async () => {
    await publishCatalog("/repo", "Allflame", 1788292800);

    expect(runAction).toHaveBeenCalledWith("/repo", ["catalog:publish", "--league=Allflame", "--hour=1788292800"]);
  });
});
