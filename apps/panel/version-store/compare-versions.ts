/** Orders versions like `3.29.10` after `3.29.9`. */
export function compareVersions(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  const differing = a.findIndex((part, at) => part !== b[at]);

  return differing === -1
    ? a.length - b.length
    : (a[differing] ?? 0) - (b[differing] ?? 0);
}
