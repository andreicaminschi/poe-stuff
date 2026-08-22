import { describe, it, expect } from "@jest/globals";
import { TYPE_RULES } from "./item-types.ts";
import { toItem } from "./to-item.ts";
import { ITEM_TYPES } from "./types.ts";
import type { ItemOverviewLine } from "./types.ts";

/**
 * One poe.ninja row in, one filter-shaped row out.
 *
 * Every fixture below is a real line, trimmed of its icon and flavour text and otherwise
 * left alone. That matters more here than it usually does: the whole reason this mapper
 * exists is that poe.ninja publishes three fields in a form nothing downstream expects,
 * and a hand-written fixture would be a fixture written by the same person who wrote the
 * assumption.
 */

const line = (fields: Partial<ItemOverviewLine>): ItemOverviewLine => ({
  id: 1,
  name: "Thing",
  chaosValue: 1,
  count: 1,
  listingCount: 1,
  ...fields,
});

/** A Foulborn unique, which is the only shape carrying a roll poe.ninja prices apart. */
const FOULBORN_HEADHUNTER: ItemOverviewLine = {
  id: 135098,
  name: "Foulborn Headhunter",
  levelRequired: 40,
  baseType: "Leather Belt",
  variant: "Culling Strike, Minimap Icons",
  itemClass: 3,
  sparkLine: { totalChange: 0, data: [] },
  implicitModifiers: [{ text: "+(25-48) to maximum Life", optional: false }],
  explicitModifiers: [{ text: "+(40-53) to Dexterity", optional: false }],
  itemType: "Belt",
  chaosValue: 1096560,
  exaltedValue: 884323,
  divineValue: 5373,
  count: 3,
  detailsId: "foulborn-headhunter-culling-strike-minimap-icons-leather-belt",
  listingCount: 3,
};

/** An ilvl 85 influenced base: the one type where `levelRequired` is an item level. */
const VAAL_REGALIA: ItemOverviewLine = {
  id: 51671,
  name: "Vaal Regalia",
  levelRequired: 85,
  variant: "Elder/Crusader",
  itemClass: 2,
  sparkLine: { totalChange: 0, data: [] },
  itemType: "Body Armour",
  chaosValue: 408.2,
  exaltedValue: 329.2,
  divineValue: 2,
  count: 2,
  detailsId: "vaal-regalia-85-elder-crusader",
  listingCount: 2,
};

/** A gem in the state it drops in — and therefore a gem with no `gemQuality` key. */
const ENLIGHTEN: ItemOverviewLine = {
  id: 2640,
  name: "Enlighten Support",
  levelRequired: 1,
  variant: "1",
  itemClass: 4,
  sparkLine: { totalChange: -20.4, data: [0, -8, -28, -28, -20.52, -28, -20.4] },
  gemLevel: 1,
  chaosValue: 199,
  exaltedValue: 160.5,
  divineValue: 0.98,
  count: 399,
  detailsId: "enlighten-support-1",
  listingCount: 1143,
};

const SCRYING_ORB: ItemOverviewLine = {
  id: 169120,
  name: "Vaal Pyramid",
  baseType: "Scrying Orb",
  itemClass: 5,
  sparkLine: { totalChange: -26.7, data: [null, null, null, 0, -28.41, -27.13, -26.7] },
  chaosValue: 1020,
  exaltedValue: 823,
  divineValue: 5,
  count: 41,
  detailsId: "vaal-pyramid",
  listingCount: 41,
};

describe("names", () => {
  it("puts a unique's roll in brackets, as PoeWatch spells it", () => {
    expect(toItem(FOULBORN_HEADHUNTER, "UniqueAccessory").name).toBe(
      "Foulborn Headhunter (Culling Strike, Minimap Icons)",
    );
  });

  it("leaves a unique with no roll alone", () => {
    const original = line({ name: "Original Sin", baseType: "Amethyst Ring" });

    expect(toItem(original, "UniqueAccessory").name).toBe("Original Sin");
  });

  it("rebuilds a Scrying Orb around its region", () => {
    expect(toItem(SCRYING_ORB, "ScryingOrb").name).toBe("Scrying Orb (Vaal Pyramid)");
  });

  it("drops the room's tier from a Chronicle, leaving one bracket", () => {
    const temple = line({
      name: "Locus of Corruption (Tier 3)",
      baseType: "Chronicle of Atzoatl",
    });

    // Nested brackets are not cosmetic: `a (b (c))` defeats the bracket-free pattern a
    // reader strips a variant with, so the roll is flattened before it goes in.
    expect(toItem(temple, "IncursionTemple").name).toBe(
      "Chronicle of Atzoatl (Locus of Corruption)",
    );
  });

  it("names a cluster jewel after the jewel, not the enchantment it rolled", () => {
    const cluster = line({
      name: "12% increased Damage with Two Handed Weapons",
      baseType: "Large Cluster Jewel",
      variant: "8 passives",
    });

    expect(toItem(cluster, "ClusterJewel").name).toBe("Large Cluster Jewel");
  });

  it("names a conqueror map after the map, which is what a filter can read", () => {
    const map = line({
      name: "Veritania Vaal Temple Map",
      baseType: "Vaal Temple Map",
      variant: "Atlas",
    });

    expect(toItem(map, "Map").name).toBe("Vaal Temple Map");
  });

  it("rebuilds a Valdo map around its reward", () => {
    const valdo = line({ name: "Rune Monolith", baseType: "Valdo Map" });

    expect(toItem(valdo, "ValdoMap").name).toBe("Valdo Map (Rune Monolith)");
  });
});

describe("Vaal transfigurations", () => {
  it("unpicks the bracket into the name the game uses", () => {
    const gem = line({
      name: "Vaal Cold Snap (Cold Snap of Power)",
      baseType: "Vaal Cold Snap",
      gemLevel: 21,
      gemQuality: 20,
    });

    expect(toItem(gem, "SkillGem").name).toBe("Vaal Cold Snap of Power");
  });

  it("splits at the last ` of `, not the first", () => {
    // Splitting at the first would read `Rain of Arrows of Saturation` as a suffix
    // beginning at ` of Arrows`, and produce `Vaal Rain of Arrows of Arrows of
    // Saturation` — a gem that does not exist.
    const gem = line({
      name: "Vaal Rain of Arrows (Rain of Arrows of Saturation)",
      baseType: "Vaal Rain of Arrows",
      gemLevel: 1,
    });

    expect(toItem(gem, "SkillGem").name).toBe("Vaal Rain of Arrows of Saturation");
  });

  it("leaves a plain transfiguration alone", () => {
    const gem = line({ name: "Spectral Throw of Trarthus", gemLevel: 21, gemQuality: 20 });

    expect(toItem(gem, "SkillGem").name).toBe("Spectral Throw of Trarthus");
  });

  it("falls back to the gem outside the bracket when the bracket says nothing", () => {
    const gem = line({ name: "Vaal Cold Snap (something else)", baseType: "Vaal Cold Snap" });

    expect(toItem(gem, "SkillGem").name).toBe("Vaal Cold Snap");
  });
});

describe("gems", () => {
  it("reads an absent quality as zero, which is the state a gem drops in", () => {
    const gem = toItem(ENLIGHTEN, "SkillGem");

    expect(gem.gemQuality).toBe(0);
    expect(gem.gemLevel).toBe(1);
    expect(gem.gemIsCorrupted).toBe(false);
  });

  it("does not read a gem's level requirement as an item level", () => {
    // `levelRequired: 1` on this row is what a character needs to socket it. Read as an
    // item level it would say the gem dropped in the first zone.
    expect(toItem(ENLIGHTEN, "SkillGem").itemLevel).toBeNull();
  });

  it("carries corruption through", () => {
    const gem = line({ name: "Enlighten Support", gemLevel: 4, corrupted: true });

    expect(toItem(gem, "SkillGem").gemIsCorrupted).toBe(true);
  });

  it("gives a non-gem no gem fields at all", () => {
    const base = toItem(VAAL_REGALIA, "BaseType");

    expect(base.gemLevel).toBeUndefined();
    expect(base.gemQuality).toBeUndefined();
  });
});

describe("bases", () => {
  it("reads levelRequired as the item level", () => {
    expect(toItem(VAAL_REGALIA, "BaseType").itemLevel).toBe(85);
  });

  it("spells influences the way PoeWatch does: lowercase, sorted, comma-joined", () => {
    expect(toItem(VAAL_REGALIA, "BaseType").influences).toBe("crusader,elder");
  });

  it("leaves an uninfluenced base with an empty influence string", () => {
    const base = line({ name: "Ghostflame Blade", levelRequired: 86, itemType: "One Handed Sword" });

    expect(toItem(base, "BaseType").influences).toBe("");
  });

  it("does not read a unique's variant as an influence", () => {
    expect(toItem(FOULBORN_HEADHUNTER, "UniqueAccessory").influences).toBe("");
  });

  it("does not read a unique's level requirement as an item level", () => {
    expect(toItem(FOULBORN_HEADHUNTER, "UniqueAccessory").itemLevel).toBeNull();
  });
});

describe("what a row is", () => {
  it("takes the frame from the type that was asked for", () => {
    expect(toItem(VAAL_REGALIA, "BaseType").frame).toBe(0);
    expect(toItem(FOULBORN_HEADHUNTER, "UniqueAccessory").frame).toBe(3);
    expect(toItem(ENLIGHTEN, "SkillGem").frame).toBe(4);
    expect(toItem(SCRYING_ORB, "ScryingOrb").frame).toBe(5);
  });

  it("ignores itemClass entirely", () => {
    // The live feed carries `2` on 95% of white crafting bases and `10` on eight ordinary
    // uniques. Anything reading it would file both wrongly, so nothing reads it.
    const nonsense = { ...VAAL_REGALIA, itemClass: 9 };

    expect(toItem(nonsense, "BaseType").frame).toBe(0);
    expect(toItem({ ...FOULBORN_HEADHUNTER, itemClass: 10 }, "UniqueAccessory").frame).toBe(3);
  });

  it("files a beast where PoeWatch files one", () => {
    const beast = line({ name: "Black Mórrigan", baseType: "Goliaths|Unnaturals|The Wilds" });
    const mapped = toItem(beast, "Beast");

    expect(mapped.category).toBe("monsters");
    expect(mapped.frame).toBe(2);
  });

  it("gives a map a null tier rather than reading one out of its name", () => {
    const map = line({ name: "Map (Tier 16)" });

    expect(toItem(map, "BlightedMap").mapTier).toBeNull();
  });

  it("keeps the type it came back under", () => {
    expect(toItem(SCRYING_ORB, "ScryingOrb").ninjaType).toBe("ScryingOrb");
  });

  it("groups equipment by its slot, and everything else by its type", () => {
    expect(toItem(VAAL_REGALIA, "BaseType").group).toBe("bodyarmour");
    expect(toItem(SCRYING_ORB, "ScryingOrb").group).toBe("currency");
  });
});

describe("prices and volume", () => {
  it("prices all three of mean, min and max at the one number published", () => {
    const mapped = toItem(VAAL_REGALIA, "BaseType");

    expect(mapped.mean).toBe(408.2);
    expect(mapped.min).toBe(408.2);
    expect(mapped.max).toBe(408.2);
  });

  it("counts listings behind the price, not listings all league", () => {
    // `count` is 3 and `listingCount` is 3 here; the two diverge wildly on traded items
    // — a tier 16 map reads 399 against 623,539 — and only the first is about today.
    expect(toItem(FOULBORN_HEADHUNTER, "UniqueAccessory").daily).toBe(3);
  });

  it("calls a thin row low confidence, since poe.ninja publishes no such flag", () => {
    expect(toItem(FOULBORN_HEADHUNTER, "UniqueAccessory").lowConfidence).toBe(true);
    expect(toItem(ENLIGHTEN, "SkillGem").lowConfidence).toBe(false);
  });

  it("defaults an absent divine price to zero rather than dropping the row", () => {
    const cheap = line({ name: "Vial of Fate", chaosValue: 2, count: 30 });

    expect(toItem(cheap, "Vial").divine).toBe(0);
  });

  it("keeps the nulls out of history and in the seven-day series", () => {
    const mapped = toItem(SCRYING_ORB, "ScryingOrb");

    expect(mapped.history).toEqual([0, -28.41, -27.13, -26.7]);
    expect(mapped.sevenDaysHistory).toEqual([null, null, null, 0, -28.41, -27.13, -26.7]);
  });

  it("carries links where the type publishes them, and omits them where it does not", () => {
    const linked = line({ name: "Dialla's Malefaction", baseType: "Sage's Robe", links: 5 });

    expect(toItem(linked, "UniqueArmour").linkCount).toBe(5);
    expect(toItem(SCRYING_ORB, "ScryingOrb").linkCount).toBeUndefined();
  });
});

describe("the shape a filter reads", () => {
  it("fills every field, on every type, including the ones poe.ninja omits", () => {
    // The compatibility claim, checked rather than asserted in prose: a caller handing
    // these rows to a classifier must never meet an absent field, whichever of the 28
    // types the row came back under.
    const required = [
      "id",
      "name",
      "group",
      "frame",
      "influences",
      "icon",
      "mean",
      "min",
      "max",
      "exalted",
      "divine",
      "daily",
      "change",
      "history",
      "sevenDaysHistory",
      "lowConfidence",
      "implicits",
      "explicits",
      "itemLevel",
      "width",
      "height",
      "category",
    ];

    for (const type of ITEM_TYPES) {
      const mapped = toItem(line({}), type) as Record<string, unknown>;

      for (const field of required) {
        expect([type, field, field in mapped]).toEqual([type, field, true]);
      }
    }
  });

  it("gives every type a footprint, even though none is published", () => {
    expect(toItem(VAAL_REGALIA, "BaseType").width).toBe(1);
    expect(toItem(VAAL_REGALIA, "BaseType").height).toBe(1);
  });

  it("has a rule for every type the API answers for", () => {
    expect(Object.keys(TYPE_RULES).sort()).toEqual([...ITEM_TYPES].sort());
  });
});
