/**
 * The tags a gem carries, as a set written down as an object.
 *
 * **A tag it does not have is absent, never `false`.** Every value in here is `true`, so
 * `tags.support` reads as a boolean check and `Object.keys(tags)` is the list.
 *
 * A `Record` rather than a union of the tag names: PoB adds one whenever GGG does, and a
 * union here would reject the new file.
 */
export type GemTags = Record<string, true>;

/** One gem variant, as Path of Building's table describes it. */
export type Gem = {
  /**
   * Metadata id of the **base** gem this row is a variant of. Not unique — a transfigured
   * variant and its parent carry the same one, which is what says they are the same gem.
   */
  gameId: string;
  /** Id of this variant. The record's key, in every ordinary case. */
  variantId: string;
  /** Id of the effect the gem grants. Equal to `variantId` except for casing on a few rows. */
  grantedEffectId: string;
  /** The name the client shows. Unique across the file. */
  name: string;
  /**
   * The item base the gem drops as. **Absent on every support gem** — a support's base type
   * is not written down here, only its `name`.
   */
  baseTypeName?: string;
  /** Highest level the gem reaches without help. 20 for most, lower for the utility skills. */
  naturalMaxLevel: number;
  /**
   * How the gem's level requirement splits across the attributes, as a weighting that
   * normally sums to 100. **Not a requirement in points** — a pure strength gem is
   * `reqStr: 100`, not `reqStr: 111`.
   */
  reqStr: number;
  reqDex: number;
  reqInt: number;
  /** The tag line the client prints under the name, comma separated. */
  tagString: string;
  tags: GemTags;
  /** Display name of a second effect the gem grants. Set on a handful of rows. */
  secondaryEffectName?: string;
  /** Id of that second effect. Set on more rows than `secondaryEffectName` is. */
  secondaryGrantedEffectId?: string;
  /** Present and `true` on Vaal gems. Absent everywhere else — never `false`. */
  vaalGem?: true;
};

/**
 * The whole `Gems.json` file: one entry per gem **variant**, keyed by the variant's
 * metadata id. There is no envelope — the file is the record.
 *
 * The key is the variant, not the gem. Group by `gameId` to get one entry per gem.
 */
export type Gems = Record<string, Gem>;
