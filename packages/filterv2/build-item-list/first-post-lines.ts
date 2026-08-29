const ENTITIES: [RegExp, string][] = [
  [/&quot;/gu, '"'],
  [/&#039;/gu, "'"],
  [/&amp;/gu, "&"],
  [/&nbsp;/gu, " "],
  [/&lt;/gu, "<"],
  [/&gt;/gu, ">"],
];

/**
 * The first post of a thread, as lines of plain text.
 *
 * The body runs from the first `class="content"` to the first reply. `class="content"`
 * repeats inside the post itself, so it cannot mark the end — `content-container` wraps a
 * reply, and the first one of those is where the post stops.
 *
 * The toggle-all script goes first, or its source ends up in the item list.
 */
export function firstPostLines(html: string): string[] {
  const start = html.indexOf('class="content"');
  const end = html.indexOf('class="content-container"', start);
  const body = html.slice(start, end < 0 ? undefined : end);

  const stripped = ENTITIES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    body
      .replace(/<script[\s\S]*?<\/script>/giu, "")
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<\/(p|div|li|tr|h1|h2|h3)>/giu, "\n")
      .replace(/<[^>]+>/gu, ""),
  );

  return stripped
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && line !== "Spoiler");
}
