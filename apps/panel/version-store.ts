import { loadState, type CategoriesFile } from "@poe/panel-state/load-state";
import { SPLIT_DEFAULTS } from "@poe/panel-state/split-defaults";
import type { PanelState } from "@poe/panel-state/types";
import type { Lake } from "@poe/lake/types";
import { openSession, type Entry, type Session } from "./session.ts";
import { compareVersions } from "./version-store/compare-versions.ts";

type VersionInfo = {
  readonly state: "draft" | "published";
  readonly parent?: string;
  readonly createdAt: string;
};

export type Manifest = { readonly next: number; readonly versions: Readonly<Record<string, VersionInfo>> };

type LegacyManifest = { readonly next: number; readonly promoted: string };

export type VersionSummary = VersionInfo & { readonly version: string };

const MANIFEST_KEY = "panel/manifest.json";
const LEGACY_MANIFEST_KEY = "admin-panel/versions/manifest.json";

const stateKey = (version: string): string => `panel/versions/${version}/state.json`;
const logKey = (version: string): string => `panel/versions/${version}/wal.json`;

/** Reads the game part of a version: `3.29.7` is `3.29`. */
const readGameVersion = (version: string): string => version.split(".").slice(0, 2).join(".");

export type VersionStore = {
  readonly list: () => Promise<readonly VersionSummary[]>;
  readonly open: (version?: string) => Promise<Session>;
  readonly save: (session: Session) => Promise<Session>;
};

/**
 * Versions of the panel state under `.s3/panel/`. The first open copies the admin panel's
 * promoted version in as a published baseline; nothing here writes the admin panel's keys.
 */
export function createVersionStore(lake: Lake): VersionStore {
  async function importBaseline(): Promise<Manifest> {
    const legacy = await lake.readJson<LegacyManifest>(LEGACY_MANIFEST_KEY);
    const file = await lake.readJson<CategoriesFile>(`admin-panel/versions/${legacy.promoted}/categories.json`);
    const manifest: Manifest = {
      next: legacy.next,
      versions: { [legacy.promoted]: { state: "published", createdAt: new Date().toISOString() } },
    };

    await lake.writeJsonAtomic(stateKey(legacy.promoted), loadState(file, SPLIT_DEFAULTS));
    await lake.writeJsonAtomic(logKey(legacy.promoted), []);
    await lake.writeJsonAtomic(MANIFEST_KEY, manifest);
    return manifest;
  }

  async function readManifest(): Promise<Manifest> {
    return (await lake.exists(MANIFEST_KEY))
      ? lake.readJson<Manifest>(MANIFEST_KEY)
      : importBaseline();
  }

  async function readLog(version: string): Promise<readonly Entry[]> {
    return (await lake.exists(logKey(version)))
      ? lake.readJson<readonly Entry[]>(logKey(version))
      : [];
  }

  async function writeVersion(version: string, state: PanelState, log: readonly Entry[]): Promise<void> {
    // log first, so it is never behind
    await lake.writeJsonAtomic(logKey(version), log);
    await lake.writeJsonAtomic(stateKey(version), state);
  }

  return {
    list: async () => {
      const manifest = await readManifest();
      return Object.entries(manifest.versions)
        .map(([version, info]) => ({ ...info, version }))
        .sort((left, right) => compareVersions(right.version, left.version));
    },

    open: async (version) => {
      const manifest = await readManifest();
      const picked = version ?? Object.keys(manifest.versions).sort(compareVersions).at(-1);
      const info = picked === undefined
        ? undefined
        : manifest.versions[picked];

      if (picked === undefined || info === undefined) throw new Error(`No version ${version ?? ""} in ${MANIFEST_KEY}.`);
      return openSession(picked, info.state === "published", await lake.readJson<PanelState>(stateKey(picked)), await readLog(picked));
    },

    save: async (session) => {
      if (session.pending.length === 0) throw new Error("Nothing to save.");
      if (!session.published) {
        const log = [...session.saved, ...session.pending];
        await writeVersion(session.version, session.state, log);
        return openSession(session.version, false, session.state, log);
      }

      const manifest = await readManifest();
      const draft = `${readGameVersion(session.version)}.${String(manifest.next)}`;
      await writeVersion(draft, session.state, session.pending);
      await lake.writeJsonAtomic(MANIFEST_KEY, {
        next: manifest.next + 1,
        versions: { ...manifest.versions, [draft]: { state: "draft", parent: session.version, createdAt: new Date().toISOString() } },
      } satisfies Manifest);
      return openSession(draft, false, session.state, session.pending);
    },
  };
}
