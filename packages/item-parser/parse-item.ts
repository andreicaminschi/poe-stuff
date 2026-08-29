/**
 * One item's text, in.
 *
 * The whole of the dispatch is here: a section is a modifier list, a requirements list, a
 * `Key: Value` list, a row of flags, or prose, and which one it is comes from its shape.
 * Nothing throws and nothing is dropped — a section this cannot read is kept verbatim in
 * `extraSections`, so a caller reading a text the game changed can still see what it said.
 *
 * This is the advanced description format, which is what the game copies. The trade site
 * still exports the older one; see `techdebt.md`.
 */

import { isModHeader, parseModSection, suffixMod } from "./parse-mods.ts";
import { parseHeader } from "./parse-header.ts";
import { hasPairs, isFlagLine, parseProperty, parseSockets, suffixedMod } from "./parse-properties.ts";
import { splitSections } from "./sections.ts";
import type { ItemMod, ItemProperty, ParseIssue, ParsedItem } from "./types.ts";

/** The line that opens a requirements section. The game prints it with nothing after it. */
const REQUIREMENTS = "Requirements:";

/** The property whose value is the item's sockets. */
const SOCKETS = "Sockets";

export function parseItem(text: string): ParsedItem {
  const sections = splitSections(text);

  const properties: ItemProperty[] = [];
  const requirements: ItemProperty[] = [];
  const mods: ItemMod[] = [];
  const flags: string[] = [];
  const extraSections: (readonly string[])[] = [];
  const issues: ParseIssue[] = [];
  let sockets: readonly string[] = [];

  if (sections.length === 0) {
    return {
      itemClass: "",
      rarity: "",
      name: "",
      baseType: "",
      properties,
      requirements,
      sockets,
      mods,
      flags,
      extraSections,
      issues: [{ kind: "empty-item", line: "", section: 0 }],
    };
  }

  for (const [index, lines] of sections.slice(1).entries()) {
    const at = index + 2;

    if (lines.some(isModHeader)) {
      const section = parseModSection(lines);
      mods.push(...section.mods);
      for (const line of section.orphans) issues.push({ kind: "orphan-mod-line", line, section: at });
      continue;
    }

    if (lines[0] === REQUIREMENTS) {
      for (const line of lines.slice(1)) {
        const property = parseProperty(line);
        if (property !== undefined) requirements.push(property);
        else flags.push(line);
      }
      continue;
    }

    // A section with no `Key: Value` line in it is either a row of short named things or a
    // paragraph, and one line of prose makes the whole section prose. Telling them apart
    // per line would put half a sentence in `flags`.
    if (!hasPairs(lines)) {
      const readable = lines.every((line) => isFlagLine(line) || suffixedMod(line) !== undefined);
      if (!readable) {
        extraSections.push(lines);
        continue;
      }
    }

    for (const line of lines) {
      const property = parseProperty(line);

      if (property !== undefined) {
        if (property.name === SOCKETS) sockets = parseSockets(property.value);
        else properties.push(property);
        continue;
      }

      const suffixed = suffixedMod(line);
      if (suffixed !== undefined) mods.push(suffixMod(suffixed.text, suffixed.kind));
      else flags.push(line);
    }
  }

  return { ...parseHeader(sections[0] ?? []), properties, requirements, sockets, mods, flags, extraSections, issues };
}

/** The value of the first property with this name, or `undefined`. */
export const property = (item: ParsedItem, name: string) =>
  item.properties.find((found) => found.name === name);
