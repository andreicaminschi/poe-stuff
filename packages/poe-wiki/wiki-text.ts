/**
 * Turning what the wiki stores into what a reader wants.
 *
 * Cargo exports the wikitext that pages are rendered from, not the rendered page, so
 * every value arrives escaped and most of them carry link markup. Two steps, in order:
 * `decodeEntities` first, because the `<br>` that separates the lines of a hybrid
 * modifier only exists once `&lt;br&gt;` has been decoded.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * HTML entities to the characters they stand for. Without this every possessive name —
 * and there are hundreds — reads `Abberath&#039;s Hooves` and matches nothing.
 *
 * An entity this does not know is left exactly as it stands, which is visible in the
 * output rather than silently wrong.
 */
export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => {
      const decoded = NAMED_ENTITIES[name];
      return decoded === undefined ? match : decoded;
    });
}

/**
 * Wikitext to plain text: `[[Avoid|avoid]]` becomes `avoid`, `[[Recently]]` becomes
 * `Recently`, and a `<br>` becomes a newline — a hybrid modifier is two lines in game
 * and stays two lines here.
 *
 * Inline HTML is unwrapped to its text, which is what a reader wants out of
 * `<abbr title="6.0m radius">Nearby</abbr>`: the word, not the tooltip. `<br>` goes
 * first, being the one tag whose meaning is the newline it stands for rather than the
 * text it wraps.
 *
 * Expects already-decoded input — a tag is only a tag once `&lt;` has become `<`. A
 * survey of the mod tables found no templates, no bold and no tables, so nothing else is
 * guessed at.
 */
export function stripMarkup(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/** Both steps, in the order they have to happen. */
export const wikiText = (value: string): string =>
  stripMarkup(decodeEntities(value));
