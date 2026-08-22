import { formatNote } from "@poe/filter-eval/format-note";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import { FAMILY_PALETTE, styleFor } from "./styles.ts";
import type { PaletteName } from "./styles.ts";
import type {
  AlertSound,
  BlockStyle,
  BucketFamily,
  MinimapIcon,
  Rgba,
  Tier,
  Verb,
} from "./types.ts";

/**
 * Turn the proto filter into one the game can be handed.
 *
 * The proto says what every drop is worth and nothing about how to draw it. This reads the
 * `#@` note each block ends with — the tier, the verb and the family the classifier
 * decided — looks the three up in `styles.ts`, and writes the action lines in.
 *
 * **Text in, text out.** Conditions are copied across verbatim rather than parsed and
 * written back. The proto contains lines no round trip would survive intact — the
 * eight-modifier maps ask `HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"`, which is a trick
 * about vowels rather than a structure — and every condition carries a trailing comment
 * saying which bucket asked for it. Re-serialising all of that to add four colour lines
 * would be a second grammar to keep in step with the first, and the failure would be
 * silent: a filter that still loads and quietly matches something else.
 *
 * So the file is parsed for its *facts* and patched as *text*. The parse is what makes the
 * patch safe — it names each block's note line, and it is the same reader that will check
 * the finished file.
 *
 * Actions are spliced in above the `#@` line rather than after it, so the note stays the
 * last line of every block and a styled filter reads exactly like the proto did.
 */

/** `SetTextColor 255 0 0 255` — the four numbers, in the order the line takes them. */
const rgba = ([red, green, blue, alpha]: Rgba): string =>
  `${red} ${green} ${blue} ${alpha}`;

const soundLine = (sound: AlertSound): string =>
  `PlayAlertSound ${sound.id} ${sound.volume}`;

const iconLine = (icon: MinimapIcon): string =>
  `MinimapIcon ${icon.size} ${icon.colour} ${icon.shape}`;

/**
 * One block's actions, in NeverSink's order: the label, then the noise, then the map.
 *
 * The order is his because a person reads these files. Two filters that set the same seven
 * things in two orders diff as fourteen changed lines, and nobody wants to find out which
 * of them mattered.
 */
export const actionLines = (style: BlockStyle): string[] => [
  `SetFontSize ${style.fontSize}`,
  `SetTextColor ${rgba(style.text)}`,
  `SetBorderColor ${rgba(style.border)}`,
  `SetBackgroundColor ${rgba(style.background)}`,
  ...(style.sound === null ? [] : [soundLine(style.sound)]),
  // Written after the alert sound and never without one. `EnableDropSound` restores the
  // noise the item itself makes on landing, and the only thing that would have taken it
  // away is the alert sound on the line above.
  ...(style.dropSound ? ["EnableDropSound"] : []),
  // No `Temp`. `buckets.md` asks for a permanent beam everywhere it asks for one at all.
  ...(style.beam === null ? [] : [`PlayEffect ${style.beam}`]),
  ...(style.icon === null ? [] : [iconLine(style.icon)]),
];

/** What a block's note said about itself. */
type Decision = {
  readonly tier: Tier;
  /** The rung the block's items could turn out to be. Only the beam reads it. */
  readonly upTo: Tier;
  readonly verb: Verb;
  readonly palette: PaletteName;
};

/**
 * A block's note, read back.
 *
 * `tier` and `verb` are required of every block by the grammar, so a block missing one
 * never reaches here — the parser refuses the file first. `family` is optional, and a block
 * without one takes the default palette: the unique palette is a claim about the item, and
 * a note that does not make it has not made it.
 */
const decisionFor = (block: FilterBlock): Decision => {
  const noted = new Map(block.notes.map((note) => [note.key, note.value]));
  const family = noted.get("family");

  const tier = (noted.get("tier") ?? "hidden") as Tier;

  return {
    tier,
    // Absent means there is no upside to draw, which is every block but a unique check.
    upTo: (noted.get("upto") ?? tier) as Tier,
    verb: (noted.get("verb") ?? "take") as Verb,
    palette:
      family === undefined ? "default" : FAMILY_PALETTE[family as BucketFamily],
  };
};

/**
 * The style a block asked for, or `null` when it asked for none.
 *
 * `hidden` is the only `null`. A `Hide` block draws nothing, so every action on it would be
 * a line the game reads and discards.
 */
const styleOf = (decision: Decision): BlockStyle | null => {
  if (decision.tier === "hidden") return null;

  return styleFor(decision.palette, decision.tier, decision.verb, decision.upTo);
};

/**
 * The block every filter needs and no bucket produces — NeverSink's safety layer.
 *
 * The last block in the file, and the only one below `HIDE_LAYER`. What reaches it is what
 * is neither priced nor gear: a currency the league added, a base type GGG renamed, an item
 * class nobody has seen before. An item matching no block at all is drawn in the game's
 * default white and easily walked past.
 *
 * **It shows rather than hides, and it is loud on purpose.** An item reaching this block
 * means the filter is stale or the generator is wrong, and the player wants to know that
 * the first time it happens rather than the tenth. The gear that used to land here — every
 * rare, every white drop — is taken by `HIDE_LAYER` one block above, which is what keeps
 * this one rare enough to be worth shouting about.
 *
 * Magenta is his colour for it, and it is his colour for *restricted* everywhere else in
 * the file too — the one shade that means "no tier fits this". It is the note's `varies`
 * said in paint.
 */
const CATCH_ALL: readonly string[] = [
  `# ${"-".repeat(84)}`,
  "# Show all unknown items. Anything reaching this block is caught in one of three cases:",
  "#   1) this filter is out of date — the league moved and it was not rebuilt",
  "#   2) something went wrong editing it by hand",
  "#   3) a genuinely unknown item dropped, which is very unlikely",
  "#",
  "# Shown rather than hidden, and loud: nobody decided to hide these, and each one is a",
  "# report that the pipeline missed something.",
  "Show",
  "\tSetFontSize 45",
  "\tSetTextColor 255 0 255 255",
  "\tSetBorderColor 255 0 255 255",
  "\tSetBackgroundColor 100 0 100 255",
  "\tPlayAlertSound 3 300",
  "\tPlayEffect Pink",
  "\tMinimapIcon 0 Pink Circle",
  `\t${formatNote({ tier: "varies", verb: "check" }, "catch-all, claimed by no bucket")}`,
];

/**
 * The classes a filter has to hide by name, because nothing above will have claimed them.
 *
 * NeverSink's list, verbatim. Every one of these drops constantly, in every rarity, at
 * every item level, and the classifier only ever claims the handful of base types worth a
 * block — an ilvl 84 Vaal Regalia, a Sapphire Ring good enough to craft on. Everything else
 * in these classes is the floor noise the filter exists to remove.
 *
 * Written with a bare `Class`, which is a substring match rather than an exact one. That is
 * his spelling and it is the forgiving direction: a class GGG renames or extends still
 * lands here instead of falling through to the block below.
 */
const HIDDEN_CLASSES = [
  "Abyss Jewels",
  "Amulets",
  "Belts",
  "Body Armours",
  "Boots",
  "Bows",
  "Claws",
  "Daggers",
  "Gloves",
  "Heist Brooches",
  "Heist Cloaks",
  "Heist Gear",
  "Heist Tools",
  "Helmets",
  "Hybrid Flasks",
  "Idols",
  "Jewels",
  "Life Flasks",
  "Mana Flasks",
  "One Hand Axes",
  "One Hand Maces",
  "One Hand Swords",
  "Quivers",
  "Rings",
  "Rune Daggers",
  "Sceptres",
  "Shields",
  "Staves",
  "Thrusting One Hand Swords",
  "Tinctures",
  "Two Hand Axes",
  "Two Hand Maces",
  "Two Hand Swords",
  "Utility Flasks",
  "Wands",
  "Warstaves",
];

/**
 * The first of the two blocks a filter ends on: hide the gear nothing tiered.
 *
 * It sits below every generated block and above the catch-all, and that position is the
 * whole of its safety. It cannot shadow a bucket, because every block that claims one is
 * more specific and was written first — an ilvl 84 base still shows, from its own block.
 * What reaches here is a rare Vaal Regalia the classifier had no price for, which is
 * exactly what a filter is for hiding.
 *
 * Without it the catch-all below catches the entire game: every rare, every magic item and
 * every white drop, painted in the colour reserved for *something has gone wrong*.
 *
 * `DisableDropSound True` because the game still plays the drop noise for a hidden item,
 * and a filter that hides a thousand rares an hour should be silent about them.
 */
const HIDE_LAYER: readonly string[] = [
  `# ${"-".repeat(84)}`,
  "# Hide the gear no block above claimed. Anything worth showing has already been shown by",
  "# its own block — this is what is left, which is the floor noise the filter exists for.",
  "Hide",
  `\tClass ${HIDDEN_CLASSES.map((name) => `"${name}"`).join(" ")}`,
  "\tSetFontSize 18",
  "\tSetBorderColor 0 0 0 0",
  "\tSetBackgroundColor 20 20 0 0",
  "\tDisableDropSound True",
  `\t${formatNote({ tier: "hidden", verb: "take" }, "hide layer, claimed by no bucket")}`,
];

/** The rule line `emit-filter.ts` puts above every block. Where the header stops. */
const RULE = /^# -{10,}$/;

const HEADER_ADDITION: readonly string[] = [
  "#",
  "# Styled: every block below carries the colours, sound, beam and minimap icon its tier",
  "# and verb ask for in packages/filter/styles.ts. The conditions are the proto's own,",
  "# copied across untouched — nothing here changed what matches, only how it is drawn.",
];

/** The paragraph the proto opens with that a styled file makes false. */
const LIE = /no colours/i;

/** What the file calls itself once it has been drawn. */
const TITLE =
  "# Item filter — generated. Every line below came out of a bucket; none was typed.";

/**
 * The proto's header, minus the paragraph that is no longer true, plus one that is.
 *
 * The header carries the provenance — which buckets file, which league, when — and none of
 * that is recoverable anywhere else, so it is kept rather than replaced. The only line that
 * has to go is the one promising the file has no colours in it.
 */
const restyleHeader = (lines: readonly string[]): string[] => {
  const stop = lines.findIndex((line) => RULE.test(line));
  // A file with no rule line was not written by `emit-filter.ts`. Nothing is assumed about
  // its head, so the note about styling goes on top and the rest is left alone.
  if (stop === -1) return [...HEADER_ADDITION.slice(1), "", ...lines];

  const header = lines.slice(0, stop);
  // The blank line separating the header from the first block belongs to the file, not to
  // the last paragraph. Left in, it would open a gap in the middle of the header.
  while (header.at(-1)?.trim() === "") header.pop();
  // The proto calls itself the proto in its first line, and this file is not that any more.
  if (header[0]?.startsWith("# Proto filter")) header[0] = TITLE;

  const paragraphs: string[][] = [[]];

  for (const line of header) {
    if (line.trim() === "#") paragraphs.push([]);
    else paragraphs[paragraphs.length - 1]?.push(line);
  }

  const kept = paragraphs
    .filter((paragraph) => !paragraph.some((line) => LIE.test(line)))
    .filter((paragraph) => paragraph.some((line) => line.trim() !== ""));

  return [
    ...kept.flatMap((paragraph, index) => (index === 0 ? paragraph : ["#", ...paragraph])),
    ...HEADER_ADDITION,
    "",
    ...lines.slice(stop),
  ];
};

/**
 * The proto filter, styled.
 *
 * Throws when a block names a tier or a family the style table has no row for. That is a
 * generator and a table that have drifted apart, and the useful moment to hear about it is
 * now rather than when the game loads a block drawn in nothing.
 */
export function styleFilter(text: string): string {
  const lines = text.split("\n");
  const blocks = parseFilter(text);

  /** Action lines, by the 0-based index of the `#@` line they go above. */
  const insertions = new Map<number, readonly string[]>();

  for (const block of blocks) {
    const style = styleOf(decisionFor(block));
    if (style === null) continue;

    const [note] = block.notes;
    if (note === undefined) {
      throw new Error(
        `the block on line ${block.line} carries no #@ note, so there is nowhere to put its actions`,
      );
    }

    insertions.set(
      note.line - 1,
      actionLines(style).map((action) => `\t${action}`),
    );
  }

  const styled = lines.flatMap((line, index) => {
    const actions = insertions.get(index);

    return actions === undefined ? [line] : [...actions, line];
  });

  const body = restyleHeader(styled);
  // The proto ends on a newline, so its last line is empty. Dropping it here keeps the
  // catch-all one blank line below the last block, like every other block in the file.
  while (body.at(-1) === "") body.pop();

  return [...body, "", ...HIDE_LAYER, "", ...CATCH_ALL, ""].join("\n");
}
