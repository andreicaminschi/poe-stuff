/**
 * The mod an essence forces, per equipment slot it can be used on.
 *
 * The same slots are on every row — `Amulet`, `Belt`, `Body Armour`, `Boots`, `Bow`,
 * `Claw`, `Dagger`, `Gloves`, `Helmet`, `One Handed Axe`, `One Handed Mace`,
 * `One Handed Sword`, `Quiver`, `Ring`, `Sceptre`, `Shield`, `Staff`,
 * `Thrusting One Handed Sword`, `Two Handed Axe`, `Two Handed Mace`, `Two Handed Sword`
 * and `Wand`.
 *
 * A `Record` rather than a union of those names: a new slot is a data change, and a union
 * here would reject the new file.
 */
export type EssenceMods = Record<string, string>;

/** One essence, as RePoE exports it. */
export type Essence = {
  /** The name the client shows, e.g. `Muttering Essence of Anger`. Unique across the file. */
  name: string;
  /**
   * How strong the essence is, 1 to 8. 1 is `Whispering` and 7 is `Deafening`; 8 is the
   * corrupted-only set — Horror, Delirium, Hysteria and Insanity.
   *
   * **Not the number on the end of the metadata id**, which counts within a family and
   * starts at 1 wherever that family's lowest tier happens to be.
   */
  tier: number;
  /**
   * Which essence this is, as an index into the family list: Hatred, Woe, Greed and the
   * rest. A number, not a name — read `name` for anything a person will see.
   */
  type: number;
  mods: EssenceMods;
};

/**
 * The whole `Essence.json` file: one entry per essence, keyed by its currency metadata id
 * such as `Metadata/Items/Currency/CurrencyEssenceAnger1`. There is no envelope — the file
 * is the record.
 */
export type Essences = Record<string, Essence>;
