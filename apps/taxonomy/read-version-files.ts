import { SOURCE_FILES, sourceKey } from "./lake.ts";
import type { Lake } from "@poe/lake/types";
import type { SourceFile, VersionFiles } from "./types.ts";

export async function readVersionFiles(
  lake: Lake,
  version: string,
): Promise<VersionFiles> {
  const read = async (file: SourceFile) =>
    [file, await lake.readJson<unknown>(sourceKey(version, file))] as const;

  return Object.fromEntries(
    await Promise.all(SOURCE_FILES.map(read)),
  ) as VersionFiles;
}
