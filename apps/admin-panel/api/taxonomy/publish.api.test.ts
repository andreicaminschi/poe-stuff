import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { publishVersion } = await import("./publish.api.ts");

describe("publishVersion", () => {
  it("publishes the named version through yarn in the repo", async () => {
    await publishVersion("/repo", "3.29.4");

    expect(runAction).toHaveBeenCalledWith("/repo", ["taxonomy:publish", "3.29.4"]);
  });
});
