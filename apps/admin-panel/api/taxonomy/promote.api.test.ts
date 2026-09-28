import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { promoteVersion } = await import("./promote.api.ts");

describe("promoteVersion", () => {
  it("makes the named version current by running yarn taxonomy:promote in the repo", async () => {
    await promoteVersion("/repo", "3.29.4");

    expect(runAction).toHaveBeenLastCalledWith("/repo", ["taxonomy:promote", "3.29.4"]);
  }); // the id is positional, unlike create's --parent
});
