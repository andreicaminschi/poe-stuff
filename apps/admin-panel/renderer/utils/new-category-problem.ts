const SLUG = /^[a-z0-9-]+$/;

export function newCategoryProblem(slug: string, path: string, taken: boolean): string | undefined {
  if (!SLUG.test(slug)) return "Use lowercase letters, digits and hyphens.";
  if (taken) return `${path} already exists.`;

  return undefined;
}
