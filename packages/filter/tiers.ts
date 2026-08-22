import tiers from "./tiers.json" with { type: "json" };
import type { EffectColour, IconShape, Rgba, Tier } from "./types.ts";

/**
 * The ladders, the leaguestart lists and the player levers, read off `tiers.json`.
 *
 * **The one module that reads that file.** Everything else imports from here, so the
 * shape is asserted once rather than in every caller — and a caller wanting a different
 * ladder asks for it by name instead of reaching into the JSON and guessing at the rows.
 *
 * Nothing here decides anything. It is the table `classify.ts` cuts tiers against and the
 * table `styles.ts` draws them from, and both of those are somebody else's business.
 */

/** How loud an icon is drawn, in the words the docs use. Maps to `MinimapIcon`'s 0–2. */
export type IconSize = "Large" | "Medium" | "Small";

/** The four sizes `buckets.md` names, plus the `M` `uniques.md` asks for at `T3` take. */
export type SizeName = "XL" | "L" | "M" | "S" | "XS";

/** The four alert sounds `buckets.md` names. `null` on a row is silence. */
export type SoundName = "Whoosh" | "Zdrang" | "Bonk" | "Unique";

/** An icon override on a ladder row. `null` keeps whatever the template already draws. */
export type IconSpec = {
  readonly colour: EffectColour;
  readonly shape: IconShape;
  readonly size: IconSize;
};

/**
 * One rung: what wins it, whether a click floor may take it away, and how it is drawn.
 *
 * `cut` is in **divine orbs** and `null` means the rung is not won on price at all —
 * bases `T0` is a quality condition, currency `T4` is the click floor itself, and the
 * leaguestart rungs are name lists. A reader walking the cuts skips those rows; the
 * branch that owns each one knows what it is instead.
 *
 * The style fields are carried but not read here. They exist so the ladder is one table a
 * person edits, rather than a cut in one file and a colour in another that drift apart.
 */
export type TierRow = {
  readonly tier: Tier;
  /**
   * The price that wins this rung, in divine orbs.
   *
   * `null`, or absent as it is on every map row, means the rung is not won on price at
   * all. A reader walking the cuts skips those; the branch that owns each one knows what
   * it is instead.
   */
  readonly cut?: number | null;
  /**
   * What `cut` is denominated in. Divine unless the row says otherwise.
   *
   * **Divine is right for a market ladder and wrong for a floor on attention.** A cut that
   * says *this is a serious drop* should follow the currency serious prices are quoted in,
   * or it re-tiers the whole game as chaos drifts. But the unique ladder asks whether a
   * base is worth hovering over, and hovering does not get more expensive because divine
   * went up — a cut in divine there silently tripled over this league, which is what hid
   * every 40c unique. So the unique cuts are in chaos, and this is the field that says so.
   */
  readonly unit?: "chaos" | "divine";
  /**
   * This rung is won by clearing the player's click floor, and nothing else.
   *
   * **Not the same as a `null` cut, and conflating the two is what made currency `T4`
   * unreachable.** A null cut means the rung is won some other way — a quality gate, a
   * name list — so a cut loop skips it. This one *is* a cut, in the one unit the file
   * cannot know in advance: `currency.md` says of `T4` that *the floor is the user input
   * of min-floor value*, and `gems.md` says the same. Skipped as a null, everything
   * between the floor and `T3` fell through to hidden — which hid a stack of six chaos.
   */
  readonly clickFloor?: boolean;
  readonly persistent: boolean;
  readonly template?: string;
  /** The template a `gamble` swaps in at this rung. Absent where no gamble reaches it. */
  readonly gambleTemplate?: string | null;
  readonly icon?: IconSpec | null;
  readonly sound?: SoundName | null;
  readonly size?: SizeName;
  readonly beam?: EffectColour | null;
};

/**
 * One map treatment. Named rather than tiered, because `maps.md` prices nothing: a map is
 * an 8-mod map or it is not, and no market number changes how that should read.
 *
 * It still carries a `tier`, because the `#@` note's grammar has no other word for how
 * loud a block is and the styler looks the style up by it.
 */
export type MapRow = TierRow & { readonly treatment: string };

export type Ladders = {
  readonly currency: readonly TierRow[];
  readonly gems: readonly TierRow[];
  readonly bases: readonly TierRow[];
  /**
   * One cut per rung, read twice — see `uniqueRung`.
   *
   * There is no take/check pair any more. Both verbs measure against these same cuts, and
   * which verb a bucket gets depends only on whether the two measurements agree.
   */
  readonly uniques: readonly TierRow[];
  readonly maps: readonly MapRow[];
  /** Today's ladder, for the families `buckets/` has no doc for yet. */
  readonly default: readonly TierRow[];
};

export type LeagueStart = {
  readonly untilAreaLevel: number;
  readonly currency: { readonly T5: readonly string[]; readonly T6: readonly string[] };
  readonly gemQuality: number;
  readonly baseQuality: number;
};

/**
 * The marker a `check` lays over the rung it sits on. Gold is the colour code of check.
 *
 * **Everything here is a diff, and the two omissions are the design.** A check does not
 * change the sound, because a sound is what says *stop what you are doing* and a maybe has
 * not earned one. And it *recolours* the beam rather than adding one — a rung with no beam
 * stays without, so an ambiguous 1c base never becomes more findable on the ground than the
 * guaranteed drops around it.
 *
 * `beam` and `icon.colour` are both limited to the eleven names the game accepts for those
 * two lines, and should be changed together or the marks disagree. `border` is `Rgba`
 * because a label colour is under no such limit.
 *
 * **The background is a tint rather than a colour, and there is no text colour at all.**
 * Painting both flat made every check on every rung the same rectangle, which threw away
 * the thing the rung had already said. So the rung's own background is mixed `strength` of
 * the way toward `colour` — recognisably itself, turned gold-ward — and the text is then
 * whichever of black or white reads on what came out. A colour that has to sit on a
 * computed background cannot be a constant.
 */
export type CheckMark = {
  readonly tint: Tint;
  readonly border: Rgba;
  readonly beam: EffectColour;
  readonly size: SizeName;
  readonly icon: IconSpec;
};

/**
 * A colour to mix toward, and how far.
 *
 * `strength` is `0..1`: `0` leaves the rung untouched, `1` replaces it outright. Alpha is
 * not mixed — the rung keeps its own, because a background's alpha is what decides how much
 * of the ground shows through and that is not a thing a check has an opinion about.
 */
export type Tint = {
  readonly colour: Rgba;
  readonly strength: number;
};

/**
 * The currency the click floor may not hide, however little it is worth.
 *
 * **Not a promotion.** These keep whatever rung their own price earns and whatever styling
 * that rung gives them — the only thing changed is that the floor cannot take the rung
 * away. A cheap scarab is still drawn as a cheap scarab; it is simply drawn.
 *
 * `staticGroups` matches the group `/data/static` filed the item under. `nameContains` is
 * a plain substring test on the game's own name, and exists because the exchange does not
 * file scarabs in one place: 124 of them sit under `Fragments` and two under `Currency`,
 * so a group test would miss half of what a player means by "scarabs".
 */
export type NeverHidden = {
  readonly staticGroups: readonly string[];
  readonly nameContains: readonly string[];
};

export type FileLevers = {
  readonly minClickValue: number;
  readonly goldPerDivine: number;
  readonly hideUniqueMaps: boolean;
  readonly gambleCeiling: number;
  readonly gambleExclude: { readonly enabled: boolean; readonly cutoff: number };
};

/**
 * The cast, in one place and on purpose.
 *
 * `resolveJsonModule` widens every string in a JSON module to `string`, so the compiler
 * cannot tell `"T3"` from `"T#"` and no amount of typing here would make it. The guard
 * below is what actually checks the part that matters.
 */
const parsed = tiers as unknown as {
  readonly levers: FileLevers;
  readonly check: CheckMark;
  readonly neverHidden: NeverHidden;
  readonly leagueStart: LeagueStart;
  readonly ladders: Ladders;
};

/** Every word `Tier` has, as a set, so a misspelling in the file is caught by name. */
const TIERS: ReadonlySet<string> = new Set([
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "varies",
  "hidden",
]);

/**
 * Every ladder's rows carry a tier the rest of the code has a word for.
 *
 * Checked at import rather than trusted, because the failure it prevents is silent: a row
 * spelled `T7` cuts nothing, the items that should have won that rung fall to the rung
 * below, and the filter is quietly wrong for a whole league. That is the same reason
 * `marketRates` throws on a missing divine instead of defaulting one.
 */
const checkTiers = (name: string, rows: readonly { readonly tier: string }[]): void => {
  for (const row of rows) {
    if (!TIERS.has(row.tier)) {
      throw new Error(
        `tiers.json: the ${name} ladder has a row tiered ${JSON.stringify(row.tier)}, which is not a tier`,
      );
    }
  }
};

checkTiers("currency", parsed.ladders.currency);
checkTiers("gems", parsed.ladders.gems);
checkTiers("bases", parsed.ladders.bases);
checkTiers("uniques", parsed.ladders.uniques);
checkTiers("maps", parsed.ladders.maps);
checkTiers("default", parsed.ladders.default);

export const LADDERS: Ladders = parsed.ladders;

export const LEAGUE_START: LeagueStart = parsed.leagueStart;

/**
 * What the player set in the file, before any flag overrides it.
 *
 * Named for where it came from rather than for what it is, because a CLI flag beats it and
 * the two must not be confused at the call site — see `classify-cli.ts`.
 */
export const FILE_LEVERS: FileLevers = parsed.levers;

/** How a `check` is marked, read off `tiers.json`. See `CheckMark`. */
export const CHECK_MARK: CheckMark = parsed.check;

/**
 * Whether the click floor is allowed to hide this item. See `NeverHidden`.
 *
 * Takes the static group as well as the name because the two answer different halves of
 * the question — a group covers a whole kind of currency at once, a name catches the ones
 * the exchange scattered.
 */
export const neverHidden = (name: string, staticGroup: string | undefined): boolean =>
  (staticGroup !== undefined &&
    parsed.neverHidden.staticGroups.includes(staticGroup)) ||
  parsed.neverHidden.nameContains.some((part) => name.includes(part));

/**
 * One ladder's price cuts, richest first, in the shape a cut loop wants.
 *
 * Rows won on something other than a price drop out rather than arriving as a `null` the
 * caller has to skip: a cut loop asks *what is this worth*, and a rung that is not about
 * worth has no answer to give it.
 */
export const cutsFor = (
  rows: readonly TierRow[],
): readonly (readonly [Tier, number])[] =>
  rows.flatMap((row) => (row.cut == null ? [] : [[row.tier, row.cut] as const]));

/** The ladders a bucket can be cut against, by the name a bucket carries. */
export type LadderName =
  | "currency"
  | "gems"
  | "bases"
  /**
   * The dual ladder: a take rung read off the base's floor and a check rung read off its
   * ceiling, the louder of the two winning. Carried as one name because a unique base is
   * one bucket that has to answer both questions — see `resolve`.
   */
  | "uniques"
  | "default";

/**
 * The rows of one ladder, by name.
 *
 * The two unique branches are separate ladders here rather than one with two columns,
 * because that is what they are: a `Take` rung and a `Check` rung of the same number are
 * different cuts on different numbers, and nothing ever wants both at once.
 */
export const LADDER_ROWS: Readonly<Record<LadderName, readonly TierRow[]>> = {
  currency: LADDERS.currency,
  gems: LADDERS.gems,
  bases: LADDERS.bases,
  uniques: LADDERS.uniques,
  default: LADDERS.default,
};

/** The unique cuts, richest first. Read once against the floor and once against the ceiling. */
export const UNIQUE_CUTS: readonly TierRow[] = LADDERS.uniques;

/**
 * The quietest rung a ladder has — where an always-shown bucket lands when its price
 * earned nothing.
 *
 * Read off the ladder rather than written down as `T5`, because the ladders do not end in
 * the same place: currency runs to `T6`, gems to `T5`, bases and uniques stop at `T4`. A
 * hardcoded floor would put a unique on a rung its own ladder has no row for, and the
 * styler would then have nothing to draw it with.
 */
export const quietestRung = (ladder: LadderName): Tier => {
  const rows = LADDER_ROWS[ladder];
  const last = rows[rows.length - 1];
  if (last === undefined) throw new Error(`tiers.json: the ${ladder} ladder has no rows`);

  return last.tier;
};

/**
 * Whether a rung refuses to be hidden by the click floor.
 *
 * A tier the ladder does not have is not persistent — there is nothing to protect. That
 * covers `hidden` and `varies`, neither of which is a rung.
 */
export const isPersistent = (ladder: LadderName, tier: Tier): boolean =>
  LADDER_ROWS[ladder].some((row) => row.tier === tier && row.persistent);
