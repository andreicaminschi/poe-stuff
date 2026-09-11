import { latestTaxonomyKey, registryKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";

type RegistryFile = {
  readonly next: number;
  readonly versions: Readonly<
    Record<
      string,
      {
        readonly state: "draft" | "published";
        readonly parent?: string;
        readonly createdAt: string;
        readonly publishedAt?: string;
      }
    >
  >;
};

export type VersionState = "draft" | "published" | "overtaken";

export type VersionSummary = {
  readonly id: string;
  readonly state: VersionState;
  readonly parent?: string;
  readonly createdAt: string;
  readonly publishedAt?: string;
  readonly editable: boolean;
};

export type VersionList = {
  readonly versions: readonly VersionSummary[];
  readonly current?: string;
};

const numberOf = (id: string): number => Number(id.split(".").at(-1));

function stateOf(published: boolean, newest: boolean): VersionState {
  if (published) return "published";
  if (newest) return "draft";

  return "overtaken";
}

export function toVersionList(registry: RegistryFile, current: string | undefined): VersionList {
  const entries = Object.entries(registry.versions).sort(([a], [b]) => numberOf(b) - numberOf(a));
  const [newest] = entries;
  const newestDraft = newest?.[1].state === "draft" ? newest[0] : undefined;

  return {
    versions: entries.map(([id, entry]) => ({
      id,
      state: stateOf(entry.state === "published", id === newestDraft),
      ...(entry.parent === undefined ? {} : { parent: entry.parent }),
      createdAt: entry.createdAt,
      ...(entry.publishedAt === undefined ? {} : { publishedAt: entry.publishedAt }),
      editable: id === newestDraft,
    })),
    ...(current === undefined ? {} : { current }),
  };
}

export async function getVersions(lake: Lake): Promise<VersionList> {
  const registry = (await lake.exists(registryKey()))
    ? await lake.readJson<RegistryFile>(registryKey())
    : { next: 1, versions: {} };
  const current = (await lake.exists(latestTaxonomyKey()))
    ? (await lake.readJson<{ version: string }>(latestTaxonomyKey())).version
    : undefined;

  return toVersionList(registry, current);
}
