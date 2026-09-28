import { latestTaxonomyKey, registryKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import { readOr } from "../util/read-or.ts";

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
  const newestDraft = newest?.[1].state === "draft"
    ? newest[0]
    : undefined;

  return {
    versions: entries.map(([id, entry]) => ({
      id,
      state: stateOf(entry.state === "published", id === newestDraft),
      ...(entry.parent === undefined
        ? {}
        : { parent: entry.parent }),
      createdAt: entry.createdAt,
      ...(entry.publishedAt === undefined
        ? {}
        : { publishedAt: entry.publishedAt }),
      editable: id === newestDraft,
    })),
    ...(current === undefined
      ? {}
      : { current }),
  };
}

export const EMPTY_REGISTRY: RegistryFile = { next: 1, versions: {} };

export async function getVersions(lake: Lake): Promise<VersionList> {
  const registry = await readOr(lake, registryKey(), EMPTY_REGISTRY);
  const latest = await readOr<{ version?: string }>(lake, latestTaxonomyKey(), {});

  return toVersionList(registry, latest.version);
}
