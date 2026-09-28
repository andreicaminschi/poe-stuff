export type Owner = { readonly key: string; readonly variant: string | undefined };

/** Writes the note that names a block's row and variant: `<key>` or `<key> <variant>`. */
export function writeOwnerNote(key: string, variant?: string): string {
  return variant === undefined
    ? key
    : `${key} ${variant}`;
}

/**
 * The row and variant a freehand names, or nothing. Keys may hold spaces, so the longest
 * known key the freehand starts with wins.
 */
export function readOwnerNote(freehand: string, isKey: (key: string) => boolean): Owner | undefined {
  const words = freehand.trim().split(" ");
  for (let end = words.length; end > 0; end--) {
    const key = words.slice(0, end).join(" ");
    if (!isKey(key)) continue;
    const variant = words.slice(end).join(" ");
    return { key, variant: variant === ""
      ? undefined
      : variant };
  }
  return undefined;
}
