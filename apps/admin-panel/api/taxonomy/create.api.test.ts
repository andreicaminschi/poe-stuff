import { describe, expect, it, jest } from "@jest/globals";

const runAction = jest.fn(async (_repo: string, _args: readonly string[]) => ({ ok: true, log: "" }));
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction }));

const { createVersion } = await import("./create.api.ts");

describe("createVersion", () => {
  it("creates a draft from the named parent through yarn in the repo", async () => {
    await createVersion("/repo", "3.29.3");

    expect(runAction).toHaveBeenCalledWith("/repo", ["taxonomy:create", "--parent=3.29.3"]);
  });
});
