/** A resizable column, in percent of the window. */
export type ColumnSize = {
  key: string;
  fallback: number;
  min: number;
  max: number;
};

export function readSavedWidth(size: ColumnSize): number {
  try {
    const raw = localStorage.getItem(size.key);
    if (raw === null || raw === "") return size.fallback;
    const width = Number(raw);
    if (!Number.isFinite(width)) return size.fallback;
    return Math.min(Math.max(width, size.min), size.max);
  } catch {
    return size.fallback;
  }
}
