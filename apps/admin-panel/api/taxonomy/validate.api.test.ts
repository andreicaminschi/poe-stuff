import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { access } from "node:fs/promises";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";

const runQuery = jest.fn<(repo: string, args: readonly string[]) => Promise<unknown>>();
jest.unstable_mockModule("../util/yarn.ts", () => ({ runQuery, runAction: jest.fn(), runYarn: jest.fn() }));

const { toValidation, validate } = await import("./validate.api.ts");

const empty = { problems: [], resolution: [], unauthored: {} };

describe("toValidation", () => {
  it("files each problem under the area its file names, flagging seeded files", () => {
    const validation = toValidation({
      ...empty,
      problems: [
        { file: "authored.seeded", key: "u", problem: "p1" },
        { file: "variants.manual", key: "v", problem: "p2" },
        { file: "items", key: "a", problem: "p3" },
      ],
    });

    expect(validation.rows).toEqual([
      { area: "authored", seeded: true, key: "u", problem: "p1" },
      { area: "variants", seeded: false, key: "v", problem: "p2" },
      { area: "items", seeded: false, key: "a", problem: "p3" },
    ]);
  });

  it("lists unauthored paths with the most rows first", () => {
    const validation = toValidation({ ...empty, unauthored: { small: 1, big: 9, mid: 4 } });

    expect(validation.unauthored).toEqual([
      { path: "big", rows: 9 },
      { path: "mid", rows: 4 },
      { path: "small", rows: 1 },
    ]);
  });
});

describe("validate", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await seedDraft(temp.lake, "3.29.2");
  });
  afterEach(() => temp.remove());

  it("validates a staged copy and removes it afterwards", async () => {
    let root = "";
    runQuery.mockImplementation(async (_repo, args) => {
      root = String(args.at(-1)).replace("--root=", "");
      await access(root);
      return empty;
    });

    await validate("/repo", temp.lake, "3.29.2", {});

    expect(runQuery).toHaveBeenCalledWith("/repo", ["taxonomy", "validate", "3.29.2", `--root=${root}`]);
    await expect(access(root)).rejects.toThrow();
  });

  it("removes the staged copy when validation itself fails", async () => {
    let root = "";
    runQuery.mockImplementation(async (_repo, args) => {
      root = String(args.at(-1)).replace("--root=", "");
      throw new Error("bad");
    });

    await expect(validate("/repo", temp.lake, "3.29.2", {})).rejects.toThrow("bad");
    await expect(access(root)).rejects.toThrow();
  });
});
