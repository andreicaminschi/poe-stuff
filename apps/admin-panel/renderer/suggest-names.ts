const MAX_WORDS = 4;
const MAX_SUGGESTIONS = 8;

export type NameSuggestion = { readonly name: string; readonly replaces: string };

/**
 * Suggests known names the end of the text starts to spell. Tries the last four words,
 * then three, two and one, and keeps the longest ending that matches anything, so a
 * name typed in full is completed as one. Low, Sonar 2.
 *
 * @example
 * suggestNames(["Heavy Belt Uniques", "Heavy Belt"], "tag heavy be");
 * // → [{ name: "Heavy Belt", replaces: "heavy be" }, { name: "Heavy Belt Uniques", replaces: "heavy be" }]
 */
export function suggestNames(knownNames: readonly string[], text: string): readonly NameSuggestion[] {
  const words = text.split(" ");
  if ((words.at(-1) ?? "").length < 2) return [];

  for (let count = Math.min(MAX_WORDS, words.length); count >= 1; count -= 1) {
    const ending = words.slice(-count).join(" ");
    const lower = ending.toLowerCase();
    const matches = knownNames.filter((name) => name.toLowerCase().startsWith(lower) && name.toLowerCase() !== lower);

    if (matches.length > 0) return [...matches].sort((left, right) => left.length - right.length).slice(0, MAX_SUGGESTIONS).map((name) => ({ name, replaces: ending }));
  }
  return [];
}
