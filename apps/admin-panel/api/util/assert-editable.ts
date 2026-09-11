import { registryKey } from "./keys.ts";
import type { Lake } from "@poe/lake/types";
import { toVersionList } from "../taxonomy/getVersions.api.ts";

type Registry = Parameters<typeof toVersionList>[0];

export async function assertEditable(lake: Lake, id: string): Promise<void> {
  const list = toVersionList(await lake.readJson<Registry>(registryKey()), undefined);
  const version = list.versions.find((candidate) => candidate.id === id);

  if (version?.editable !== true) {
    throw new Error(`${id} cannot be edited. Only the newest draft can.`);
  }
}
