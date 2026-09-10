export const DEFAULT_PREFIX = "taxonomy";

export const LATEST_FILE = "latest/taxonomy.json";

export const versionKey = (prefix: string, version: string): string =>
  `${prefix}/${version}.json`;

export const latestKey = (prefix: string): string => `${prefix}/${LATEST_FILE}`;

export const LATEST_CATEGORIES_FILE = "latest/categories.json";

export const categoriesKey = (prefix: string, version: string): string =>
  `${prefix}/${version}.categories.json`;

export const latestCategoriesKey = (prefix: string): string =>
  `${prefix}/${LATEST_CATEGORIES_FILE}`;
