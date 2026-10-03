import type { Command } from "./commands.ts";
import type { Category, ManifestEntry, PanelState, WalEntry } from "./types.ts";

export type LoadedVersion = {
  readonly version: string;
  readonly state: ManifestEntry["state"];
  readonly categories: readonly Category[];
  readonly log: readonly WalEntry[];
};

export type PanelApi = {
  readonly load: () => Promise<PanelState>;
  readonly dispatch: (command: Command, proof: string) => Promise<PanelState>;
};

export const LOAD = "load";
export const DISPATCH = "dispatch";
