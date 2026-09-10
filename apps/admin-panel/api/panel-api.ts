import type { RunSummary } from "./catalog.getRuns.api.ts";
import type { Draft, DraftChanges } from "./taxonomy.types.ts";
import type { VersionList } from "./taxonomy.getVersions.api.ts";
import type { Resolution } from "./taxonomy.resolve.api.ts";
import type { Validation } from "./taxonomy.validate.api.ts";
import type { ActionResult } from "./yarn.ts";

export type PanelApi = {
  getVersions(): Promise<VersionList>;
  getVersion(id: string): Promise<Draft>;
  saveDraft(id: string, changes: DraftChanges): Promise<void>;
  validate(id: string): Promise<Validation>;
  resolveItem(id: string, key: string): Promise<readonly Resolution[]>;
  resolveCategory(id: string, path: string): Promise<Resolution>;
  createVersion(parent: string): Promise<ActionResult>;
  publishVersion(id: string): Promise<ActionResult>;
  promoteVersion(id: string): Promise<ActionResult>;
  getRuns(): Promise<readonly RunSummary[]>;
  buildCatalog(league: string, force: readonly CatalogSource[]): Promise<ActionResult>;
  publishCatalog(league: string, hour: number): Promise<ActionResult>;
  getPriceNames(): Promise<readonly string[]>;
};

export const API_NAMES = [
  "getVersions",
  "getVersion",
  "saveDraft",
  "validate",
  "resolveItem",
  "resolveCategory",
  "createVersion",
  "publishVersion",
  "promoteVersion",
  "getRuns",
  "buildCatalog",
  "publishCatalog",
  "getPriceNames",
] as const satisfies readonly (keyof PanelApi)[];

export const LEAGUE = "Allflame";

export const CATALOG_SOURCES = ["ggg", "poewatch", "repoe", "taxonomy"] as const;

export type CatalogSource = (typeof CATALOG_SOURCES)[number];

export type { ActionResult, Draft, DraftChanges, Resolution, RunSummary, Validation, VersionList };
