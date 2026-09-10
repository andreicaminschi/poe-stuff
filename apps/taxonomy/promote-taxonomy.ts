import { categoriesKey, latestCategoriesKey, latestKey, versionKey } from "./lake.ts";
import type { Lake } from "@poe/lake/types";

export async function promoteTaxonomy(lake: Lake, version: string): Promise<readonly string[]> {
  if (!(await lake.exists(versionKey(version)))) {
    throw new Error(`${version} is not published. Publish it first.`);
  }

  if (!(await lake.exists(categoriesKey(version)))) {
    throw new Error(
      `${version} was published before categories had their own file. Publish a new version.`,
    );
  }

  const copies = [
    [categoriesKey(version), latestCategoriesKey()],
    [versionKey(version), latestKey()],
  ] as const;

  for (const [source, target] of copies) {
    await lake.writeJsonAtomic(target, await lake.readJson<unknown>(source));
  }

  return copies.map(([, target]) => target);
}
