import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { publishVersion } = await import("./publish.api.ts");

describe("publishVersion", () => {
  it("publishes the named version by running yarn taxonomy:publish in the repo", async () => {
    await publishVersion("/repo", "3.29.4");

    expect(runAction).toHaveBeenLastCalledWith("/repo", ["taxonomy:publish", "3.29.4"]);
  }); // publishes into the real lake: no --root flag
});
