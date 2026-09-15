/** What Save does to an edited category, when it does more than write the record. */
export function categorySaveNote(from: string, moved: string | undefined, renamed: string | undefined): string | undefined {
  if (moved !== undefined && renamed !== undefined) {
    return `Saving moves this subcategory to ${moved}, then renames it to ${renamed}, with every row filed in it. Undo reverts one step at a time.`;
  }
  if (moved !== undefined) return `Saving moves this subcategory and every row filed in it to ${moved}.`;
  if (renamed === undefined) return undefined;
  if (from.includes("/")) return `Saving renames ${from} to ${renamed}, with every row filed in it.`;

  return `Saving renames ${from} to ${renamed}, with its subcategories and every row filed in it.`;
}
