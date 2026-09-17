export const slug = (field: string): string =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const catalogKey = (league: string): string =>
  `catalog/latest/${slug(league)}.catalog.json`;

export const categoriesKey = (league: string): string =>
  `catalog/latest/${slug(league)}.catalog.categories.json`;
