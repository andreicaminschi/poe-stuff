import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";

type Result = { ok: boolean; log: string };
const runAction = jest.fn<(repo: string, args: readonly string[]) => Promise<Result>>();
const runQuery = jest.fn<(repo: string, args: readonly string[]) => Promise<unknown>>();
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction, runQuery, runYarn: jest.fn() }));

const { compileFilter } = await import("./compile.api.ts");

const flag = (args: readonly string[], name: string): string =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";

describe("compileFilter", () => {
  let temp: TempLake;
  let documents: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    documents = await tempLake();
    await seedDraft(temp.lake, "3.29.2");
  });
  afterEach(async () => {
    await temp.remove();
    await documents.remove();
  });

  it("publishes and compiles the staged copy, then copies the filter into the game's folder", async () => {
    let root = "";
    runAction.mockImplementation(async (_repo, args) => {
      root = flag(args, "root");
      return { ok: true, log: "" };
    });
    runQuery.mockImplementation(async (_repo, args) => {
      await writeFile(flag(args, "out"), "Show\n");
      return { blocks: 1, skipped: [{ key: "k", problem: "p" }] };
    });

    const compiled = await compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    const path = join(documents.root, "My Games", "Path of Exile", "taxonomy-compiled.filter");
    expect(compiled).toEqual({ path, blocks: 1, skipped: [{ key: "k", problem: "p" }] });
    await expect(readFile(path, "utf8")).resolves.toBe("Show\n");
    expect(runAction).toHaveBeenCalledWith("/repo", ["taxonomy", "publish", "3.29.2", `--root=${root}`]);
    expect(runQuery).toHaveBeenCalledWith("/repo", [
      "catalog:compile",
      "--taxonomy-version=3.29.2",
      `--root=${root}`,
      `--out=${join(root, "taxonomy-compiled.filter")}`,
    ]);
    await expect(access(root)).rejects.toThrow();
  });

  it("throws the publish log, compiles nothing and removes the staged copy when the draft does not publish", async () => {
    let root = "";
    runAction.mockImplementation(async (_repo, args) => {
      root = flag(args, "root");
      return { ok: false, log: "invalid row a" };
    });

    await expect(compileFilter("/repo", temp.lake, "3.29.2", documents.root, {})).rejects.toThrow("invalid row a");
    expect(runQuery).not.toHaveBeenCalled();
    await expect(access(root)).rejects.toThrow();
  });
});
