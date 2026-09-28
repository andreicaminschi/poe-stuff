import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { createVersion } = await import("./create.api.ts");

describe("createVersion", () => {
  it("starts a new draft from the named parent by running yarn taxonomy:create in the repo", async () => {
    await createVersion("/repo", "3.29.3");

    expect(runAction).toHaveBeenLastCalledWith("/repo", ["taxonomy:create", "--parent=3.29.3"]);
  }); // the parent goes in a flag, not a positional
});
