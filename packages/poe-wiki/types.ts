/**
 * One row as Cargo returns it: the wiki's own column names, and booleans as 0 or 1.
 *
 * Every value arrives HTML-escaped, because these columns are rendered into pages before
 * they are ever exported — `Abberath&#039;s Hooves` is what comes off the wire.
 */
export type CargoUniqueRow = {
  readonly name: string;
  readonly base_type: string;
  readonly category: string;
  readonly restricted_drop: number;
};

/**
 * One unique, as this package hands it out.
 *
 * `category` is the wiki's display class — `Ring`, `Amulet`, `Body Armour`,
 * `Two-Handed Sword` — not the internal id, which spells the same things `AtlasRelic`
 * and `UtilityFlask`.
 *
 * `restrictedDrop` is the wiki's editorial judgement, not something GGG publishes: true
 * for anything that cannot drop from the general pool — league-only, boss-only,
 * vendor-recipe, prophecy. It exists nowhere in GGG's own data, which is the reason to
 * come here for it at all.
 */
export type WikiUniqueItem = {
  readonly name: string;
  readonly baseType: string;
  readonly category: string;
  readonly restrictedDrop: boolean;
};
