import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";

type Result = { ok: boolean; log: string };
type OnLine = (line: string) => void;
const runAction = jest.fn<(repo: string, args: readonly string[]) => Promise<Result>>();
const runQuery = jest.fn<(repo: string, args: readonly string[], onLine?: OnLine) => Promise<unknown>>();
jest.unstable_mockModule("../util/yarn.ts", () => ({ runAction, runQuery, runYarn: jest.fn() }));

const { validateFilter } = await import("./validateFilter.api.ts");

const flag = (args: readonly string[], name: string): string =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";

const report = { sampled: 2, unfiltered: 0, unsampled: [], rows: [] };

const validatorPrints = (...lines: string[]) =>
  runQuery.mockImplementation(async (_repo, args, onLine) => {
    for (const line of lines) onLine?.(line);
    await writeFile(flag(args, "out"), JSON.stringify(report));
    return {};
  });

describe("validateFilter", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    runAction.mockReset();
    runQuery.mockReset();
    await seedDraft(temp.lake, "3.29.2");
    runAction.mockResolvedValue({ ok: true, log: "" });
  });
  afterEach(() => temp.remove());

  it("answers with the report the validator wrote to disk, not what it printed", async () => {
    runQuery.mockImplementation(async (_repo, args) => {
      await writeFile(flag(args, "out"), JSON.stringify(report));
      return { printed: true };
    });

    const validation = await validateFilter("/repo", temp.lake, "3.29.2", {});

    expect(validation).toEqual(report);
  }); // stdout is too small a pipe for a big report

  it("validates inside the throwaway lake and removes it afterwards", async () => {
    let root = "";
    runQuery.mockImplementation(async (_repo, args) => {
      root = flag(args, "root");
      await writeFile(flag(args, "out"), JSON.stringify(report));
      return {};
    });

    await validateFilter("/repo", temp.lake, "3.29.2", {});

    expect(runQuery).toHaveBeenCalledWith(
      "/repo",
      ["catalog:validate", "--taxonomy-version=3.29.2", `--root=${root}`, `--out=${join(root, "unfiltered.json")}`],
      expect.any(Function),
    );
    await expect(access(root)).rejects.toThrow();
  });

  it("reports each progress line the validator prints as a step out of a total with its label", async () => {
    validatorPrints("progress 1/3 building samples", "progress 2/3 matching blocks");
    const notify = jest.fn<(progress: { step: number; total: number; label: string }) => void>();

    await validateFilter("/repo", temp.lake, "3.29.2", {}, notify);

    expect(notify.mock.calls.map(([progress]) => progress)).toEqual([
      { step: 1, total: 3, label: "building samples" },
      { step: 2, total: 3, label: "matching blocks" },
    ]);
  }); // numbers are parsed, the label keeps its spaces

  it("ignores stderr lines that are not progress, such as warnings", async () => {
    validatorPrints("warning: slow disk", "progress 1/x broken", "progress 3/3");
    const notify = jest.fn();

    await validateFilter("/repo", temp.lake, "3.29.2", {}, notify);

    expect(notify).not.toHaveBeenCalled();
  }); // a progress line needs digits and a label

  it("reads a progress line padded with whitespace", async () => {
    validatorPrints("  progress 1/1 done  ");
    const notify = jest.fn();

    await validateFilter("/repo", temp.lake, "3.29.2", {}, notify);

    expect(notify).toHaveBeenCalledWith({ step: 1, total: 1, label: "done" });
  }); // trimmed before matching

  it("validates without a progress listener", async () => {
    validatorPrints("progress 1/1 done");

    const validation = validateFilter("/repo", temp.lake, "3.29.2", {});

    await expect(validation).resolves.toEqual(report);
  }); // defaults to a no-op listener

  it("throws the publish log and never validates when the draft does not publish", async () => {
    runAction.mockResolvedValue({ ok: false, log: "invalid row a" });

    const validation = validateFilter("/repo", temp.lake, "3.29.2", {});

    await expect(validation).rejects.toThrow("invalid row a");
    expect(runQuery).not.toHaveBeenCalled();
  });
});
