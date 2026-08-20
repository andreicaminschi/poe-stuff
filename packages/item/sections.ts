/**
 * The item text, cut into the sections the game separates with a row of hyphens.
 *
 * This is the whole of the file-level grammar. Everything else in this package works on one
 * section at a time, which is what keeps a section the game adds later from disturbing the
 * ones around it.
 */

/** The separator. Exactly eight hyphens on a line of their own. */
const SEPARATOR = "--------";

/**
 * Sections, in order, each already trimmed of its blank and trailing-space lines.
 *
 * The game leaves a trailing space on several lines — `Sockets: W-W-W ` and the last line
 * of a help section both have one — so every line is right-trimmed here rather than at each
 * of the places that would otherwise have to remember.
 *
 * An empty section is dropped. The game does not print one, and a text pasted with a stray
 * separator should not become a section nobody can read.
 */
export function splitSections(text: string): readonly (readonly string[])[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trimEnd() === SEPARATOR) {
      if (current.length > 0) sections.push(current);
      current = [];
      continue;
    }

    const trimmed = line.trimEnd();
    if (trimmed !== "") current.push(trimmed);
  }

  if (current.length > 0) sections.push(current);

  return sections;
}
