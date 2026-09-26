import { registryKey } from "./keys.ts";
import type { Lake } from "@poe/lake/types";
import { EMPTY_REGISTRY, toVersionList } from "../taxonomy/getVersions.api.ts";
import { readOr } from "./read-or.ts";

export async function assertEditable(lake: Lake, id: string): Promise<void> {
  const registry = await readOr(lake, registryKey(), EMPTY_REGISTRY);
  const version = toVersionList(registry, undefined).versions.find((candidate) => candidate.id === id);

  if (version?.editable !== true) {
    throw new Error(`${id} cannot be edited. Only the newest draft can.`);
  }
}
