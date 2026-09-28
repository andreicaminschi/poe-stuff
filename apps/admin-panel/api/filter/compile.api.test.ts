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
  let root: string;
  beforeEach(async () => {
    temp = await tempLake();
    documents = await tempLake();
    root = "";
    runAction.mockReset();
    runQuery.mockReset();
    await seedDraft(temp.lake, "3.29.2");
    runAction.mockImplementation(async (_repo, args) => {
      root = flag(args, "root");
      return { ok: true, log: "" };
    });
    runQuery.mockImplementation(async (_repo, args) => {
      await writeFile(flag(args, "out"), "Show\n");
      return { blocks: 1, skipped: [{ key: "k", problem: "p" }] };
    });
  });
  afterEach(async () => {
    await temp.remove();
    await documents.remove();
  });

  const gameFolderFile = () => join(documents.root, "My Games", "Path of Exile", "taxonomy-compiled.filter");

  it("copies the compiled filter into the game's folder under Documents, creating the folder", async () => {
    await compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    await expect(readFile(gameFolderFile(), "utf8")).resolves.toBe("Show\n");
  }); // My Games/Path of Exile need not exist yet

  it("answers where the filter went, how many blocks it has and which rows were skipped", async () => {
    const compiled = await compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    expect(compiled).toEqual({ path: gameFolderFile(), blocks: 1, skipped: [{ key: "k", problem: "p" }] });
  });

  it("compiles the version that was published into the throwaway lake, writing into that lake", async () => {
    await compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    expect(runQuery).toHaveBeenCalledWith("/repo", [
      "catalog:compile",
      "--taxonomy-version=3.29.2",
      `--root=${root}`,
      `--out=${join(root, "taxonomy-compiled.filter")}`,
    ]);
  }); // the same root publish used, never the real lake

  it("removes the throwaway lake once the filter is copied out", async () => {
    await compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    await expect(access(root)).rejects.toThrow();
  });

  it("throws the publish log and compiles nothing when the draft does not publish", async () => {
    runAction.mockImplementation(async (_repo, args) => {
      root = flag(args, "root");
      return { ok: false, log: "invalid row a" };
    });

    const compiling = compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    await expect(compiling).rejects.toThrow("invalid row a");
    expect(runQuery).not.toHaveBeenCalled();
    await expect(access(root)).rejects.toThrow();
  }); // an invalid draft never reaches the game folder

  it("leaves no filter in the game folder when compiling fails", async () => {
    runQuery.mockRejectedValue(new Error("compile broke"));

    const compiling = compileFilter("/repo", temp.lake, "3.29.2", documents.root, {});

    await expect(compiling).rejects.toThrow("compile broke");
    await expect(access(gameFolderFile())).rejects.toThrow();
  }); // the copy happens only after a successful compile
});
