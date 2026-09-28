import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";

type Result = { ok: boolean; log: string };
const runAction = jest.fn<(repo: string, args: readonly string[]) => Promise<Result>>();
const runQuery =
  jest.fn<(repo: string, args: readonly string[], onLine?: (line: string) => void) => Promise<unknown>>();
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction, runQuery, runYarn: jest.fn() }));

const { validateFilter } = await import("./validateFilter.api.ts");

const flag = (args: readonly string[], name: string): string =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";

const report = { sampled: 2, unfiltered: 0, unsampled: [], rows: [] };

describe("validateFilter", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await seedDraft(temp.lake, "3.29.2");
    runAction.mockResolvedValue({ ok: true, log: "" });
  });
  afterEach(() => temp.remove());

  it("answers with the report the validator wrote to disk, not what it printed", async () => {
    let root = "";
    runQuery.mockImplementation(async (_repo, args) => {
      root = flag(args, "root");
      await writeFile(flag(args, "out"), JSON.stringify(report));
      return { printed: true };
    });

    await expect(validateFilter("/repo", temp.lake, "3.29.2", {})).resolves.toEqual(report);
    expect(runQuery).toHaveBeenCalledWith(
      "/repo",
      ["catalog:validate", "--taxonomy-version=3.29.2", `--root=${root}`, `--out=${join(root, "unfiltered.json")}`],
      expect.any(Function),
    );
    await expect(access(root)).rejects.toThrow();
  });

  it("throws the publish log and never validates when the draft does not publish", async () => {
    runAction.mockResolvedValue({ ok: false, log: "invalid row a" });

    await expect(validateFilter("/repo", temp.lake, "3.29.2", {})).rejects.toThrow("invalid row a");
    expect(runQuery).not.toHaveBeenCalled();
  });
});
