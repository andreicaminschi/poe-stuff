import { pointerKey, versionKey } from "./lake.ts";
import type { Lake } from "./types.ts";

/**
 * Points `latest` at a version.
 *
 * The pointer holds a version rather than a copy of the table, so nothing is stored twice
 * and a promote is one small write. A version that was never published is refused here
 * rather than at the reader, where it would surface as a missing file long after the
 * mistake was made.
 */
export async function promoteTaxonomy(
  lake: Lake,
  version: string,
): Promise<string> {
  if (!(await lake.exists(versionKey(version)))) {
    throw new Error(`${version} is not published. Publish it first.`);
  }

  const key = pointerKey();
  await lake.writeJson(key, { version });

  return key;
}
