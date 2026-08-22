import {
  CHECK_MARK,
  LADDERS,
  LEAGUE_START,
  type IconSize,
  type IconSpec,
  type SizeName,
  type SoundName,
  type TierRow,
} from "./tiers.ts";
import type {
  AlertSound,
  BlockStyle,
  BucketFamily,
  EffectColour,
  IconShape,
  MinimapIcon,
  Rgba,
  Tier,
  Verb,
} from "./types.ts";

/**
 * What a block looks like on the ground, as `buckets/buckets.md` writes it.
 *
 * **The doc is the table now.** Every rung's look lives in `tiers.json` beside its cut, as
 * four words — a template, a sound, a size, a beam — and this file is what those four words
 * mean. That is the whole change from the version before it, which spelled fourteen rungs
 * out longhand and could disagree with the doc without anything noticing.
 *
 * So there are five small tables here and no ladder at all:
 *
 * - `COLOURS` — the names `buckets.md` paints in, as `R G B A`.
 * - `TEMPLATES` — the fifteen `C:`, `U:`, `Bases:`, `Gems:` and `maps:` rows.
 * - `SOUNDS` — Whoosh, Zdrang, Bonk, Unique, all four carrying the drop noise.
 * - `SIZES` — XL, L, M, S, XS.
 * - `FAMILY_LADDER` — which ladder a bucket family is drawn from.
 *
 * `styleFor` composes them. Nothing here reads a price and nothing decides a tier.
 */

/**
 * The colours `buckets.md` names, and the one place a name becomes a number.
 *
 * The doc paints in words — `Text:Red`, `BG:Nude` — and words have to become `R G B A`
 * somewhere. Where a template writes `rgb(...)` outright the doc's own numbers are used and
 * no name is invented for them.
 *
 * Alpha is spelled out on every one because the game's default alpha is not the same on all
 * three lines — 240 on a background, 255 on a border and a text colour — so a table that
 * left it off would be three tables.
 *
 * **Five of these are mine rather than the doc's.** `Orange`, `Yellow` and `Nude` come off
 * NeverSink's currency ladder, which is where the rest of this repo's colour sense came
 * from. `Cyan` and `Purple` appear in no filter I copied — `bases.md` and `gems.md` ask for
 * a cyan and `maps.md` for a purple, and these are the two values I picked. They are the
 * first thing to change if either reads badly in game.
 */
const COLOURS = {
  Red: [255, 0, 0, 255],
  White: [255, 255, 255, 255],
  Black: [0, 0, 0, 255],
  Orange: [240, 90, 35, 255],
  Yellow: [249, 150, 25, 255],
  Nude: [210, 178, 135, 255],
  Brown: [175, 96, 37, 255],
  Cyan: [0, 148, 168, 255],
  Purple: [110, 60, 160, 255],
} as const satisfies Record<string, Rgba>;

type ColourName = keyof typeof COLOURS;

/** A colour by name, or a literal the doc wrote as `rgb(...)`. */
const rgba = (name: ColourName): Rgba => COLOURS[name];

/**
 * One colour mixed part of the way toward another, keeping the first one's alpha.
 *
 * Straight per-channel arithmetic, no gamma correction. The game draws these as flat sRGB
 * rectangles and the blend is a design knob rather than a measurement, so a blend that
 * matches what the number *says* beats one that is physically right and surprising to tune.
 */
const mix = (base: Rgba, toward: Rgba, strength: number): Rgba => {
  const at = Math.min(Math.max(strength, 0), 1);
  const channel = (from: number, to: number): number => Math.round(from + (to - from) * at);

  return [
    channel(base[0], toward[0]),
    channel(base[1], toward[1]),
    channel(base[2], toward[2]),
    base[3],
  ];
};

/**
 * Black or white, whichever is readable on the given background.
 *
 * WCAG relative luminance, flipping at `0.4`. That is above the 0.179 point where the two
 * contrast ratios are equal, and deliberately so: a label is small text over a colour the
 * eye reads for a fraction of a second, and biasing toward white keeps the dark two thirds
 * of the ladder legible rather than technically compliant.
 *
 * Nothing calls this on a hand-written template. It exists for the one colour that is
 * computed rather than chosen — a check's tinted background, which no table can know ahead
 * of time.
 */
const readableText = (background: Rgba): Rgba => {
  const linear = (value: number): number => {
    const channel = value / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * linear(background[0]) +
    0.7152 * linear(background[1]) +
    0.0722 * linear(background[2]);

  return luminance > 0.4 ? rgba("Black") : rgba("White");
};

/**
 * One `buckets.md` template: the three colours, and the icon it draws by default.
 *
 * The icon is part of the template because the doc puts it there — `C:WhiteAndRed` is
 * red-on-white *with a large red circle* — and a ladder row overrides it by writing its own
 * `icon`. A template with no icon at all draws none, which is what the `:NoIcon` variants
 * and the flat rows are for.
 */
type Template = {
  readonly text: Rgba;
  readonly border: Rgba;
  readonly background: Rgba;
  readonly icon: IconSpec | null;
};

const template = (
  text: Rgba,
  border: Rgba,
  background: Rgba,
  icon: IconSpec | null = null,
): Template => ({ text, border, background, icon });

const icon = (colour: EffectColour, shape: IconShape, size: IconSize): IconSpec => ({
  colour,
  shape,
  size,
});

/**
 * The templates, verbatim from `buckets.md`.
 *
 * The `:Gamble` variants are typed out rather than derived, because the reddish backgrounds
 * the doc gives them are not a function of anything. The border is the one thing all three
 * share: a gamble is outlined in red, at every rung, so the *this is not what it says it is*
 * reads the same on a T1 as on a T4. `U:BrownAndBlack:Gamble` used to be the exception, and
 * a black outline on a reddish brown is not an outline anyone sees.
 */
const TEMPLATES: Readonly<Record<string, Template>> = {
  "C:WhiteAndRed": template(
    rgba("Red"),
    rgba("Red"),
    rgba("White"),
    icon("Red", "Circle", "Large"),
  ),
  "C:OrangeAndWhite": template(
    rgba("White"),
    rgba("Black"),
    rgba("Orange"),
    icon("Orange", "Circle", "Medium"),
  ),
  // **`buckets.md` writes `BG:Black` here, and taken literally it paints black text on a
  // black background — a T3 block nobody can read.** Every other template in that file is
  // named `<Background>And<Text>`, so `OrangeAndBlack` is an orange background with black
  // text, and the line contradicts its own name. Reading it that way also lands exactly on
  // NeverSink's `t3annul`, which is where the rest of this ladder came from: T2 is white on
  // this same orange, T3 is black on it, T4 is black on the yellow below.
  "C:OrangeAndBlack": template(
    rgba("Black"),
    rgba("Black"),
    rgba("Orange"),
    icon("Yellow", "Circle", "Small"),
  ),
  "C:OrangeAndYellow": template(
    rgba("Black"),
    rgba("Black"),
    rgba("Yellow"),
    icon("White", "Circle", "Small"),
  ),
  "C:FlatYellow": template(rgba("Black"), rgba("Yellow"), rgba("Yellow")),
  "C:FlatNude": template(rgba("Black"), rgba("Nude"), rgba("Nude")),

  "U:WhiteAndBrown": template(
    rgba("Brown"),
    rgba("Brown"),
    rgba("White"),
    icon("Red", "Star", "Large"),
  ),
  "U:BrownAndWhite": template(
    rgba("White"),
    rgba("White"),
    rgba("Brown"),
    icon("Brown", "Star", "Medium"),
  ),
  "U:BrownAndWhite:Gamble": template(
    [226, 150, 150, 255],
    rgba("Red"),
    [175, 60, 37, 255],
  ),
  "U:BrownAndBrown": template(
    [175, 96, 37, 255],
    [175, 96, 37, 255],
    [53, 13, 13, 255],
    icon("Brown", "Star", "Small"),
  ),
  "U:BrownAndBrown:Gamble": template(
    rgba("Red"),
    rgba("Red"),
    [53, 13, 13, 255],
  ),
  "U:BrownAndBlack": template(rgba("Black"), rgba("Black"), rgba("Brown")),
  "U:BrownAndBlack:Gamble": template(
    rgba("Black"),
    rgba("Red"),
    [175, 60, 37, 255],
  ),

  "Bases:CyanAndWhite": template(
    rgba("White"),
    rgba("Cyan"),
    rgba("Cyan"),
    icon("Cyan", "Diamond", "Large"),
  ),
  "Bases:CyanAndWhite:NoIcon": template(rgba("White"), rgba("Cyan"), rgba("Cyan")),

  "Gems:CyanAndBlack": template(
    rgba("Black"),
    rgba("Cyan"),
    rgba("Cyan"),
    icon("Cyan", "Triangle", "Large"),
  ),
  "Gems:CyanAndBlack:NoIcon": template(rgba("Black"), rgba("Cyan"), rgba("Cyan")),

  "maps:Normal": template(
    rgba("Black"),
    rgba("Black"),
    rgba("White"),
    icon("Red", "Square", "Small"),
  ),
  "maps:Unique": template(
    rgba("White"),
    rgba("Brown"),
    rgba("Brown"),
    icon("Red", "Square", "Large"),
  ),
  // `buckets.md` writes `Icon:Red:(Square:Purple)`, which puts a colour where the size
  // goes. Read as a large purple square: the row is the loud one, and `maps.md` gives all
  // three treatments that use it a purple beam, so purple is plainly the intent.
  "maps:Tink": template(
    rgba("Black"),
    rgba("Black"),
    rgba("White"),
    icon("Purple", "Square", "Large"),
  ),
};

/**
 * The purple unique templates, for Foulborn.
 *
 * **Derived rather than written, because `foulborn.md` describes them rather than
 * specifying them:** *follow the same rules as uniques, visually they should have a
 * purple-ish tint for each tier*. So each `U:` template is taken and its browns swapped for
 * purples, which keeps the two families the same shape — a Foulborn drop reads as a unique
 * first and as Foulborn second, which is the order a player needs them in.
 *
 * The gamble rows keep their red and take the purple underneath, which is the doc's
 * *combination of visuals + reddish + purple-ish*.
 */
const FOULBORN_PURPLE: Rgba = [150, 90, 200, 255];
const FOULBORN_DARK: Rgba = [38, 20, 55, 255];

/**
 * The beam and icon colour a Foulborn rung takes instead of the unique ladder's.
 *
 * `MinimapIcon` and `PlayEffect` take eleven named colours and no numbers, so the purple
 * tint cannot be applied to those the way it is to the label — the swap has to be a name.
 * Only `Brown` moves: it is the colour that means *unique* on the unique ladder, and it is
 * the only one Foulborn needs to say something else with.
 */
const purple = (colour: EffectColour): EffectColour =>
  colour === "Brown" ? "Purple" : colour;

const foulbornTemplates: Readonly<Record<string, Template>> = {
  "U:WhiteAndBrown": template(
    FOULBORN_PURPLE,
    FOULBORN_PURPLE,
    rgba("White"),
    icon("Purple", "Star", "Large"),
  ),
  "U:BrownAndWhite": template(
    rgba("White"),
    rgba("White"),
    FOULBORN_PURPLE,
    icon("Purple", "Star", "Medium"),
  ),
  "U:BrownAndWhite:Gamble": template([226, 150, 210, 255], rgba("Red"), [130, 45, 150, 255]),
  "U:BrownAndBrown": template(
    FOULBORN_PURPLE,
    FOULBORN_PURPLE,
    FOULBORN_DARK,
    icon("Purple", "Star", "Small"),
  ),
  "U:BrownAndBrown:Gamble": template(rgba("Red"), rgba("Red"), FOULBORN_DARK),
  "U:BrownAndBlack": template(rgba("Black"), rgba("Black"), FOULBORN_PURPLE),
  "U:BrownAndBlack:Gamble": template(rgba("Black"), rgba("Red"), [130, 45, 150, 255]),
};

/** The four sounds `buckets.md` names. All four keep the game's own drop noise. */
const SOUNDS: Readonly<Record<SoundName, AlertSound>> = {
  Whoosh: { id: 6, volume: 300 },
  Zdrang: { id: 1, volume: 300 },
  Bonk: { id: 2, volume: 300 },
  Unique: { id: 3, volume: 300 },
};

/**
 * The sizes `buckets.md` names.
 *
 * `M` is not in the doc's table and `uniques.md` asks for it at `T3` take. Read as 30 — the
 * midpoint of `L` and `S`, which is the only reading the surrounding rows leave room for.
 */
const SIZES: Readonly<Record<SizeName, number>> = {
  XL: 45,
  L: 35,
  M: 30,
  S: 26,
  XS: 18,
};

/** `MinimapIcon`'s sizes run backwards: 0 is the largest the game draws. */
const ICON_SIZE: Readonly<Record<IconSize, 0 | 1 | 2>> = {
  Large: 0,
  Medium: 1,
  Small: 2,
};

const minimapIcon = (spec: IconSpec): MinimapIcon => ({
  size: ICON_SIZE[spec.size],
  colour: spec.colour,
  shape: spec.shape,
});

/**
 * Which ladder each family is drawn from.
 *
 * `uniques` is the pair, and the verb picks the branch — see `styleFor`. `default` is the
 * old NeverSink ladder, and the two families still on it are the two `buckets/` has no doc
 * for. `maps` is keyed by tier like the rest, because the map rows were given distinct
 * tiers for exactly that reason.
 */
export type PaletteName =
  | "currency"
  | "gems"
  | "bases"
  | "uniques"
  | "foulborn"
  | "maps"
  | "default";

export const FAMILY_PALETTE: Readonly<Record<BucketFamily, PaletteName>> = {
  bases: "bases",
  "corruptible-uniques": "uniques",
  "div-cards": "currency",
  foulborn: "foulborn",
  fragments: "currency",
  gems: "gems",
  maps: "maps",
  misc: "currency",
  replicas: "uniques",
  stackables: "currency",
  "unique-maps": "maps",
  "uniques-by-base": "uniques",
};

/**
 * The rows a palette draws from, and which template set paints them.
 *
 * Foulborn shares the unique ladder outright — same cuts, same rungs, same four words per
 * rung — and differs only in the paint. That is `foulborn.md` in one line, and it is why
 * the two are one entry with a flag rather than two ladders that have to be kept in step.
 */
const PALETTE_ROWS: Readonly<
  Record<
    PaletteName,
    {
      readonly take: readonly TierRow[];
      readonly check: readonly TierRow[];
      readonly purple: boolean;
    }
  >
> = {
  currency: { take: LADDERS.currency, check: LADDERS.currency, purple: false },
  gems: { take: LADDERS.gems, check: LADDERS.gems, purple: false },
  bases: { take: LADDERS.bases, check: LADDERS.bases, purple: false },
  // One row set, read for both verbs. `uniques.md` gives a check the same styling as the
  // take at its rung — the verb says *why* the bucket is loud, the rung says how loud.
  uniques: { take: LADDERS.uniques, check: LADDERS.uniques, purple: false },
  foulborn: { take: LADDERS.uniques, check: LADDERS.uniques, purple: true },
  maps: { take: LADDERS.maps, check: LADDERS.maps, purple: false },
  // Nothing in `buckets/` covers the families still on this, so they keep the currency
  // look rather than a palette of their own. It is the least surprising place to put them
  // and it costs no table.
  default: { take: LADDERS.currency, check: LADDERS.currency, purple: false },
};

/**
 * The style a block asked for, or `null` when its tier is not on that palette's ladder.
 *
 * **The verb picks the branch before the tier picks the row**, which is the whole of what
 * `uniques.md` added. A `check` at `T2` is a different row from a `take` at `T2` — size S
 * and silent against size L with a sound — and reading the take row for both is exactly the
 * bug that announced a 9c unique like a divine.
 *
 * A `gamble` reads the check row and swaps in that row's `gambleTemplate`, so it keeps the
 * loudness of the rung it sits on and changes only the paint. That is the doc's own split:
 * the tier says how loud, the gamble says *this is not what it says it is*.
 *
 * `null` is returned rather than thrown for a tier the ladder has no row for — `hidden`
 * being the obvious one, since a `Hide` block draws nothing.
 */
export function styleFor(
  palette: PaletteName,
  tier: Tier,
  verb: Verb,
  upTo: Tier = tier,
): BlockStyle | null {
  const rows = PALETTE_ROWS[palette];
  const branch = verb === "take" ? rows.take : rows.check;
  const row = branch.find((entry) => entry.tier === tier);
  if (row === undefined) return null;

  const wanted =
    verb === "gamble" && row.gambleTemplate != null
      ? row.gambleTemplate
      : row.template;
  if (wanted === undefined) return null;

  const paint =
    (rows.purple ? foulbornTemplates[wanted] : undefined) ?? TEMPLATES[wanted];
  if (paint === undefined) {
    throw new Error(
      `styles.ts has no template called ${JSON.stringify(wanted)}, which ${palette} ${tier} asks for`,
    );
  }

  // The row's own icon wins over the template's; a row with none takes whatever the
  // template already draws.
  //
  // **`null` means "nothing to say", not "draw nothing".** `buckets.md` suppresses an icon
  // by naming a different template — that is what every `:NoIcon` row is for — so a row
  // that leaves the field empty is deferring, never overriding. Reading its `null` as *no
  // icon* silently stripped the mark off every base and every unique `T0`, which is the
  // one thing those rungs exist to put on the minimap.
  const spec = row.icon ?? paint.icon;

  // The check marker, over whatever the rung already drew. Only the unique families have
  // one: elsewhere `check` is the same claim the tier already made, and a marker for it
  // would be a second colour saying nothing new.
  const marked = verb === "check" && (palette === "uniques" || palette === "foulborn");

  // The rung this bucket could turn out to be. Only the beam reads it — see below.
  const aspiration = marked
    ? branch.find((entry) => entry.tier === upTo)
    : undefined;

  const background = marked
    ? mix(paint.background, CHECK_MARK.tint.colour, CHECK_MARK.tint.strength)
    : paint.background;

  return {
    // **A check tints the rung rather than repainting it.** The background it lands on is
    // the rung's own mixed toward gold, so a `T0` check still reads as `T0` and a `T4`
    // check as `T4` — what the gold says is *there may be more here*, which is a question
    // about this rung and means nothing if every rung answers it the same colour.
    //
    // The text follows the background out. Once the background is computed, no fixed text
    // colour is readable on all of them, so it is picked against the blend that came out.
    text: marked ? readableText(background) : paint.text,
    border: marked ? CHECK_MARK.border : paint.border,
    background,
    fontSize: SIZES[marked ? CHECK_MARK.size : (row.size ?? "L")],
    // The sound is never the check's business. It is the one line that says *stop what you
    // are doing*, and a maybe has not earned one.
    sound: row.sound == null ? null : SOUNDS[row.sound],
    // Every sound in `buckets.md` is written `Sound:n:300:Drop`, so the two travel
    // together: a block with an alert sound keeps the game's own noise, and a silent block
    // has nothing to keep it beside.
    dropSound: row.sound != null,
    // **A check takes its beam from the rung it could be, not the rung it is.**
    //
    // `PlayEffect` is the only mark the game draws out in the world rather than on the
    // label or the minimap, and what makes a drop worth crossing a room for is the upside
    // rather than the guarantee. So a 1c Heavy Belt is a 1c label — it is drawn at what is
    // certainly there — but it beams like the Mageblood it might be, recoloured gold to say
    // the pillar of light is a maybe.
    //
    // Recoloured, never invented: if the aspirational rung has no beam either, there is
    // none. Nothing about a check conjures a mark the ladder did not already spend.
    //
    // Off a check, the beam is the rung's own, tinted with the rest of it — a Foulborn drop
    // painted purple and beamed brown would be two marks disagreeing about one item.
    beam: marked
      ? (aspiration?.beam == null ? null : CHECK_MARK.beam)
      : row.beam == null
        ? null
        : rows.purple
          ? purple(row.beam)
          : row.beam,
    // **Recoloured, never invented — the same rule the beam follows.** A check turns the
    // rung's own mark gold; it does not add one where the rung drew none. `T4` take has no
    // minimap icon, so a `T4` check has none either, and the quietest unique in the file
    // stays quiet on the map however large its upside.
    icon:
      spec == null ? null : minimapIcon(marked ? CHECK_MARK.icon : spec),
  };
}

/** Every rung of the currency ladder that the leaguestart lists reach. Read by the docs. */
export const LEAGUE_START_TIERS: readonly Tier[] = ["T5", "T6"];

export { LEAGUE_START };
