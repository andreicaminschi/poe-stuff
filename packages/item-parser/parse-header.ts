/**
 * The first section: what the item is called and what kind of thing it is.
 *
 * The game prints two `Key: Value` lines and then the name, on one line or two. Two lines
 * is a rare or a unique — the rolled name and the base it was rolled on. One line is
 * everything else, and that line is the base type, which is also what a filter compares
 * `BaseType` against.
 */

export type ItemHeader = {
  readonly itemClass: string;
  readonly rarity: string;
  readonly name: string;
  readonly baseType: string;
};

const PAIR = /^([A-Za-z][A-Za-z '-]*(?:\s*\([^)]*\))?):\s*(.*)$/;

/**
 * Reads the header out of the first section's lines.
 *
 * Missing values come back as `""` rather than throwing. A text pasted from somewhere that
 * prints no `Item Class:` is still an item worth reading the modifiers off, and a caller
 * that needs the class can see that it is empty.
 */
export function parseHeader(lines: readonly string[]): ItemHeader {
  let itemClass = "";
  let rarity = "";
  const names: string[] = [];

  for (const line of lines) {
    const pair = PAIR.exec(line);

    if (pair?.[1] === "Item Class") itemClass = pair[2] ?? "";
    else if (pair?.[1] === "Rarity") rarity = pair[2] ?? "";
    else names.push(line);
  }

  // The base type is the last name line either way, which is what makes the one-line case
  // fall out rather than needing a branch of its own.
  return {
    itemClass,
    rarity,
    name: names.length > 1 ? (names[0] ?? "") : "",
    baseType: names[names.length - 1] ?? "",
  };
}
