import { describe, it, expect } from "@jest/globals";
import type { GGGStat } from "@poe/ggg/get-stats.types";
import { modMatcher } from "./match-mods.ts";
import { parseModHeader, parseModLine } from "./parse-mods.ts";
import type { ItemMod } from "./types.ts";

/**
 * Matching against a stat list written out here rather than fetched.
 *
 * A fixture list keeps these tests off the network and makes each case say what it is
 * about, but every entry below is copied from GGG's real `/data/stats` — the duplicate
 * wordings across types, the multi-line text, the option list and the missing `reduced`
 * counterpart are all things the published list actually does.
 */

const stat = (id: string, type: string, text: string, options?: GGGStat["options"]): GGGStat => ({
  id: `${type}.${id}`,
  text,
  type,
  ...(options === undefined ? {} : { options }),
});

const STATS: readonly GGGStat[] = [
  // The same wording under four types, which is why a header has to break the tie.
  stat("stat_3299347043", "explicit", "+# to maximum Life"),
  stat("stat_3299347043", "implicit", "+# to maximum Life"),
  stat("stat_3299347043", "fractured", "+# to maximum Life"),
  stat("stat_3299347043", "crafted", "+# to maximum Life"),

  // Published in one direction only. A flask printing `reduced` is this at a negative.
  stat("stat_388617051", "explicit", "#% increased Charges per use"),

  // The two halves of a hybrid, published apart.
  stat("stat_624954515", "explicit", "#% increased Global Accuracy Rating"),
  stat("stat_1263695895", "explicit", "#% increased Light Radius"),

  // A stat whose text is several lines, the way a map's implicit is.
  stat(
    "stat_299373046",
    "implicit",
    "Area is infested with Fungal Growths\nMap's Item Quantity Modifiers also affect Blight Chest count at 25% value",
  ),

  // A stat whose `#` stands for words rather than a number.
  stat("pseudo_tangled_implicit_tier", "pseudo", "Eater of Worlds Implicit Modifier (#)", [
    { id: 1, text: "Lesser" },
    { id: 2, text: "Greater" },
    { id: 3, text: "Grand" },
  ]),

  // Published as a pseudo and nothing else.
  stat("pseudo_temple_legion_3", "pseudo", "Has Room: Hall of Legends (Tier 3)"),
];

const matcher = modMatcher(STATS);

/** A modifier, built the way the parser builds one. */
const mod = (header: string, ...lines: string[]): ItemMod => ({
  header: parseModHeader(header),
  lines: lines.map(parseModLine),
  reminders: [],
});

const ids = (found: { readonly id: string }[] | readonly { readonly id: string }[]) =>
  found.map((one) => one.id);

describe("choosing between candidates", () => {
  it("puts the type the header asked for first", () => {
    const { stats } = matcher.match(mod('{ Master Crafted Prefix Modifier "Upgraded" }', "+149(145-159) to maximum Life"));

    expect(stats[0]).toMatchObject({ type: "crafted", preferred: true });
  });

  it("keeps the candidates nobody asked for, behind the ones who did", () => {
    const { stats } = matcher.match(mod('{ Master Crafted Prefix Modifier "Upgraded" }', "+149 to maximum Life"));

    expect(stats).toHaveLength(4);
    expect(stats.slice(1).every((found) => !found.preferred)).toBe(true);
  });

  it("reads an implicit as an implicit when the header names no type", () => {
    const { stats } = matcher.match(mod("{ Implicit Modifier }", "+149 to maximum Life"));

    expect(stats[0]).toMatchObject({ type: "implicit", preferred: true });
  });

  it("reads a prefix as an explicit when the header names no type", () => {
    const { stats } = matcher.match(mod('{ Prefix Modifier "Vigorous" }', "+149 to maximum Life"));

    expect(stats[0]).toMatchObject({ type: "explicit", preferred: true });
  });

  it("still matches when the header names a type nobody publishes", () => {
    const { stats } = matcher.match(mod("{ Unique Modifier }", "+149 to maximum Life"));

    expect(stats).toHaveLength(4);
  });
});

describe("reading the numbers", () => {
  it("takes them from where the stat writes its placeholders", () => {
    const { stats } = matcher.match(mod('{ Prefix Modifier "Vigorous" }', "+149(145-159) to maximum Life"));

    expect(stats[0]?.values).toEqual([149]);
  });

  it("gives a stat with no placeholder no values", () => {
    const { pseudos } = matcher.match(mod("{ Implicit Modifier }", "Has Room: Hall of Legends (Tier 3)"));

    expect(pseudos[0]?.values).toEqual([]);
  });
});

describe("a modifier written the other way round", () => {
  it("matches the direction GGG publishes, at a negative", () => {
    const { stats } = matcher.match(mod('{ Prefix Modifier "Chemist\'s" }', "28(28-26)% reduced Charges per use"));

    expect(stats[0]).toMatchObject({ id: "explicit.stat_388617051", values: [-28] });
  });
});

describe("a modifier of several lines", () => {
  it("matches the published stat that spans them, rather than one line of it", () => {
    const { stats } = matcher.match(
      mod(
        "{ Implicit Modifier }",
        "Area is infested with Fungal Growths",
        "Map's Item Quantity Modifiers also affect Blight Chest count at 25% value",
      ),
    );

    expect(ids(stats)).toEqual(["implicit.stat_299373046"]);
  });

  it("matches each line on its own when no published stat spans them", () => {
    const { stats } = matcher.match(
      mod('{ Suffix Modifier "of Radiance" }', "17(16-20)% increased Global Accuracy Rating", "15% increased Light Radius"),
    );

    expect(ids(stats)).toEqual(["explicit.stat_624954515", "explicit.stat_1263695895"]);
    expect(stats.map((found) => found.values)).toEqual([[17], [15]]);
  });
});

describe("a stat published as a list of choices", () => {
  it("matches on the words and says which choice they were", () => {
    const { pseudos } = matcher.match(mod("{ Implicit Modifier }", "Eater of Worlds Implicit Modifier (Grand)"));

    expect(pseudos[0]).toMatchObject({ id: "pseudo.pseudo_tangled_implicit_tier", option: 3 });
  });
});

describe("a stat published as a pseudo and nothing else", () => {
  it("is a match even though no explicit or implicit says the same thing", () => {
    const found = matcher.match(mod("{ Implicit Modifier }", "Has Room: Hall of Legends (Tier 3)"));

    expect(found.stats).toEqual([]);
    expect(ids(found.pseudos)).toEqual(["pseudo.pseudo_temple_legion_3"]);
  });
});

describe("a modifier GGG never published", () => {
  it("comes back with nothing rather than with something close", () => {
    const found = matcher.match(mod("{ Monster Modifier }", "Constantly Revives Minions"));

    expect(found).toEqual({ stats: [], pseudos: [] });
  });
});
