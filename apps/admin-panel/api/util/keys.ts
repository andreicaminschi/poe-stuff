export type SourceFile =
  | "items"
  | "categories"
  | "authored.seeded"
  | "authored.manual"
  | "variants.seeded"
  | "variants.manual";

export const registryKey = (): string => "taxonomy/registry.json";

export const sourceKey = (version: string, file: SourceFile): string =>
  `taxonomy/versions/${version}/${file}.json`;

export const latestTaxonomyKey = (): string => "taxonomy/latest/taxonomy.json";

export const ledgerKey = (version: string): string => `admin-panel/ledger/${version}.json`;

export const ledgerArchiveKey = (version: string): string => `admin-panel/ledger/${version}.published.json`;

export const CATALOG_PREFIX = "catalog";

export const RUN_FOLDER = /^run=(.+)$/;

export const manifestKey = (runId: string): string => `catalog/run=${runId}/manifest.json`;
