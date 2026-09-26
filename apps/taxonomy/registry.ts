import { registryKey } from "./lake.ts";
import type { Lake } from "@poe/lake/types";
import type { Registry, RegistryEntry } from "./types.ts";

const PATTERN = /^(\d+\.\d+)\.(\d+)$/;

/** `3.29.7` is game `3.29`, number `7`. */
function parseVersion(version: string): { readonly game: string; readonly number: number } {
  const [, game, number] = PATTERN.exec(version) ?? [];

  if (game === undefined || number === undefined) {
    throw new Error(`"${version}" is not a version. Expected <game>.<number>, e.g. 3.29.7.`);
  }

  return { game, number: Number(number) };
}

export const versionNumber = (version: string): number => parseVersion(version).number;

export const gameVersion = (version: string): string => parseVersion(version).game;

const EMPTY: Registry = { next: 1, versions: {} };

export async function readRegistry(lake: Lake): Promise<Registry> {
  return (await lake.exists(registryKey()))
    ? await lake.readJson<Registry>(registryKey())
    : EMPTY;
}

export async function writeRegistry(lake: Lake, registry: Registry): Promise<void> {
  await lake.writeJsonAtomic(registryKey(), registry);
}

export function entryOf(registry: Registry, version: string): RegistryEntry {
  const entry = registry.versions[version];

  if (entry === undefined) {
    throw new Error(`${version} does not exist.`);
  }

  return entry;
}

export function newestVersion(registry: Registry): string | undefined {
  return Object.keys(registry.versions).sort((a, b) => versionNumber(b) - versionNumber(a))[0];
}

export function highestDraft(registry: Registry): string | undefined {
  const newest = newestVersion(registry);

  return newest !== undefined && registry.versions[newest]?.state === "draft" ? newest : undefined;
}

export function assertParentPublished(registry: Registry, parent: string): void {
  if (entryOf(registry, parent).state !== "published") {
    throw new Error(`${parent} is a draft. A new version starts from a published one.`);
  }
}

export function assertPublishable(registry: Registry, version: string): void {
  const entry = entryOf(registry, version);

  if (entry.state === "published") {
    throw new Error(`${version} is already published. Create a new version instead.`);
  }

  if (highestDraft(registry) !== version) {
    throw new Error(
      `${version} has been overtaken by ${String(newestVersion(registry))}. Only the newest version can be published.`,
    );
  }
}

export function nextVersion(registry: Registry, parent: string): string {
  return `${gameVersion(parent)}.${registry.next}`;
}
