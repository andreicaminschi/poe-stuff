/** Edits a typed name may be off by: one for names up to 7 letters, two for longer ones. */
const allowEdits = (name: string): number => (name.length <= 7
  ? 1
  : 2);

/**
 * Counts the edits between two strings: a letter added, dropped or changed, or two neighbours
 * swapped (the optimal string alignment distance). It stops early once two rows in a row are all
 * past `limit`, since no later row can come back under it, and then answers `limit + 1`.
 *
 * @example
 * countEdits("rigns", "rings"); // → 1
 * countEdits("rings", "quivers", 2); // → 3, meaning "more than 2"
 */
export function countEdits(left: string, right: string, limit = Number.POSITIVE_INFINITY): number {
  let twoBack = new Int32Array(right.length + 1);
  let oneBack = Int32Array.from({ length: right.length + 1 }, (_, column) => column);
  let oneBackPast = Math.min(...oneBack) > limit;

  for (let row = 1; row <= left.length; row += 1) {
    const current = new Int32Array(right.length + 1);
    current[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1]
        ? 0
        : 1;
      const best = Math.min(oneBack[column]! + 1, current[column - 1]! + 1, oneBack[column - 1]! + cost);
      const swapped = row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1];
      current[column] = swapped
        ? Math.min(best, twoBack[column - 2]! + 1)
        : best;
    }
    const currentPast = Math.min(...current) > limit;
    if (currentPast && oneBackPast) return limit + 1;
    twoBack = oneBack;
    oneBack = current;
    oneBackPast = currentPast;
  }
  return Math.min(oneBack[right.length]!, limit + 1);
}

/**
 * Finds the stored name a typed one means. An exact match wins, then one that differs only in
 * case. Otherwise it's the closest name within the edits its length allows, and nothing when
 * none is close enough or two names tie. It assumes nothing about how close stored names are to
 * each other; it only relies on them being unique.
 *
 * @example
 * resolveName("rigns", ["Rings", "Belts"]); // → "Rings"
 * resolveName("bots", ["Boots", "Bows"]);   // → undefined (a tie)
 */
export function resolveName(typed: string, names: readonly string[]): string | undefined {
  const lower = typed.toLowerCase();
  const exact = names.find((name) => name === typed) ?? names.find((name) => name.toLowerCase() === lower);
  if (exact !== undefined) return exact;

  const close = names
    .filter((name) => Math.abs(name.length - typed.length) <= allowEdits(name))
    .map((name) => ({ name, edits: countEdits(lower, name.toLowerCase(), allowEdits(name)) }))
    .filter(({ name, edits }) => edits <= allowEdits(name));
  const fewest = Math.min(...close.map(({ edits }) => edits));
  const best = close.filter(({ edits }) => edits === fewest);

  return best.length === 1
    ? best[0]?.name
    : undefined;
}
