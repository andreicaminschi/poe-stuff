import type { RunSummary } from "./catalog/getRuns.api.ts";
import type { CompiledFilter, CompileSkip } from "./filter/compile.api.ts";
import type { Form } from "./prices/getForms.api.ts";
import type { PriceName } from "./prices/getNames.api.ts";
import type { Ledger, LedgerEntry } from "./ledger/types.ts";
import type { Draft, DraftChanges } from "./taxonomy/types.ts";
import type { VersionList } from "./taxonomy/getVersions.api.ts";
import type { Resolution } from "./taxonomy/types.ts";
import type { Validation } from "./taxonomy/validate.api.ts";
import type { ActionResult } from "./util/yarn.ts";

export type PanelApi = {
  getVersions(): Promise<VersionList>;
  getVersion(id: string): Promise<Draft>;
  saveDraft(id: string, changes: DraftChanges): Promise<void>;
  validate(id: string, changes: DraftChanges): Promise<Validation>;
  createVersion(parent: string): Promise<ActionResult>;
  publishVersion(id: string): Promise<ActionResult>;
  promoteVersion(id: string): Promise<ActionResult>;
  getRuns(): Promise<readonly RunSummary[]>;
  buildCatalog(league: string, force: readonly CatalogSource[]): Promise<ActionResult>;
  publishCatalog(league: string, hour: number): Promise<ActionResult>;
  getListingNames(): Promise<readonly PriceName[]>;
  getExchangeNames(): Promise<readonly PriceName[]>;
  getForms(name: string): Promise<readonly Form[]>;
  getLedger(id: string): Promise<Ledger>;
  appendLedger(id: string, entry: LedgerEntry): Promise<void>;
  popLedger(id: string, seq: number): Promise<void>;
  commitLedger(id: string): Promise<void>;
  compileFilter(id: string, changes: DraftChanges): Promise<CompiledFilter>;
};

export const API_NAMES = [
  "getVersions",
  "getVersion",
  "saveDraft",
  "validate",
  "createVersion",
  "publishVersion",
  "promoteVersion",
  "getRuns",
  "buildCatalog",
  "publishCatalog",
  "getListingNames",
  "getExchangeNames",
  "getForms",
  "getLedger",
  "appendLedger",
  "popLedger",
  "commitLedger",
  "compileFilter",
] as const satisfies readonly (keyof PanelApi)[];

export const LEAGUE = "Allflame";

export const CATALOG_SOURCES = ["ggg", "poewatch", "taxonomy"] as const;

export type CatalogSource = (typeof CATALOG_SOURCES)[number];

export type {
  ActionResult,
  CompiledFilter,
  CompileSkip,
  Draft,
  DraftChanges,
  Form,
  Ledger,
  LedgerEntry,
  PriceName,
  Resolution,
  RunSummary,
  Validation,
  VersionList,
};
