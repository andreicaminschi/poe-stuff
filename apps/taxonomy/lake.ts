import type { SourceFile } from "./types.ts";

export const PREFIX = "taxonomy";

export const SOURCE_FILES: readonly SourceFile[] = [
  "items",
  "categories",
  "authored.seeded",
  "authored.manual",
  "variants.seeded",
  "variants.manual",
];

export const sourceKey = (version: string, file: SourceFile): string =>
  `${PREFIX}/versions/${version}/${file}.json`;

export const versionKey = (version: string): string => `${PREFIX}/${version}.json`;

export const categoriesKey = (version: string): string => `${PREFIX}/${version}.categories.json`;

export const registryKey = (): string => `${PREFIX}/registry.json`;

export const latestKey = (): string => `${PREFIX}/latest/taxonomy.json`;

export const latestCategoriesKey = (): string => `${PREFIX}/latest/categories.json`;
