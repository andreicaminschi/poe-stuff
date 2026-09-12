import { rm } from "node:fs/promises";
import type { Lake } from "@poe/lake/types";
import type { DraftChanges, Resolution } from "./types.ts";
import { stageWorking } from "../util/stage-working.ts";
import { runQuery } from "../util/yarn.ts";

type ValidateOutput = {
  readonly problems: readonly { readonly file: string; readonly key: string; readonly problem: string }[];
  readonly resolution: readonly Resolution[];
  readonly unauthored: Readonly<Record<string, number>>;
};

export type Area = "items" | "categories" | "authored" | "variants";

export type RowProblem = {
  readonly area: Area;
  readonly seeded: boolean;
  readonly key: string;
  readonly problem: string;
};

export type Validation = {
  readonly rows: readonly RowProblem[];
  readonly resolution: readonly Resolution[];
  readonly unauthored: readonly { readonly path: string; readonly rows: number }[];
};

const areaOf = (file: string): Area => file.split(".")[0] as Area;

export function toValidation(output: ValidateOutput): Validation {
  return {
    rows: output.problems.map(({ file, key, problem }) => ({
      area: areaOf(file),
      seeded: file.endsWith(".seeded"),
      key,
      problem,
    })),
    resolution: output.resolution,
    unauthored: Object.entries(output.unauthored)
      .map(([path, rows]) => ({ path, rows }))
      .sort((a, b) => b.rows - a.rows),
  };
}

/** The working version — the draft, the ledger and the unsaved edits — validated on a staged copy. */
export async function validate(repo: string, lake: Lake, id: string, changes: DraftChanges): Promise<Validation> {
  const root = await stageWorking(lake, id, changes);

  try {
    return toValidation(await runQuery<ValidateOutput>(repo, ["taxonomy", "validate", id, `--root=${root}`]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
