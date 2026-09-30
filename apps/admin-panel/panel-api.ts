import type { Category, ManifestEntry, WalEntry } from "./types.ts";

export type LoadedVersion = {
  readonly version: string;
  readonly state: ManifestEntry["state"];
  readonly categories: readonly Category[];
  readonly log: readonly WalEntry[];
};

export type PanelApi = {
  readonly loadVersion: () => Promise<LoadedVersion>;
  readonly saveVersion: (
    version: string,
    categories: readonly Category[],
    entries: readonly WalEntry[],
  ) => Promise<LoadedVersion>;
};

export const LOAD_VERSION = "loadVersion";
export const SAVE_VERSION = "saveVersion";
