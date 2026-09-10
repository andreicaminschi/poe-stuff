import type { Condition } from "./taxonomy.types.ts";
import { runQuery } from "./yarn.ts";

export type Level = "category" | "subcategory" | "item" | "variant";

export type ResolvedCondition = Condition & { readonly level: Level };

export type Resolution = {
  readonly key: string;
  readonly variant?: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly problems: readonly string[];
};

export const resolveItem = (repo: string, id: string, key: string): Promise<readonly Resolution[]> =>
  runQuery(repo, ["taxonomy", "resolve", id, `--id=${key}`]);

export const resolveCategory = (repo: string, id: string, path: string): Promise<Resolution> =>
  runQuery(repo, ["taxonomy", "resolve", id, `--category=${path}`]);
