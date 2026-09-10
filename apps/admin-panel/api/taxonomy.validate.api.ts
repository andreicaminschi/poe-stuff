import type { Resolution } from "./taxonomy.resolve.api.ts";
import { runQuery } from "./yarn.ts";

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

export async function validate(repo: string, id: string): Promise<Validation> {
  return toValidation(await runQuery<ValidateOutput>(repo, ["taxonomy", "validate", id]));
}
