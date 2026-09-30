import type { Category, ManifestEntry } from "./types.ts";

export type LoadedVersion = {
  readonly version: string;
  readonly state: ManifestEntry["state"];
  readonly categories: readonly Category[];
};

export type PanelApi = {
  readonly loadVersion: () => Promise<LoadedVersion>;
  readonly saveVersion: (version: string, categories: readonly Category[]) => Promise<LoadedVersion>;
};

export const LOAD_VERSION = "loadVersion";
export const SAVE_VERSION = "saveVersion";
