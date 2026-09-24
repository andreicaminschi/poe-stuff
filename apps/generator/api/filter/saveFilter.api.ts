import { writeFile } from "node:fs/promises";

export type SavedFilter = { readonly path: string } | { readonly cancelled: true };

/** Writes the filter text wherever the person picks. */
export async function saveFilter(text: string, choosePath: () => Promise<string | undefined>): Promise<SavedFilter> {
  const path = await choosePath();
  if (path === undefined) return { cancelled: true };

  await writeFile(path, text, "utf8");
  return { path };
}
