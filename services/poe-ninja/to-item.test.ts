import { describe, expect, it } from "@jest/globals";
import { TYPE_RULES } from "./item-types.ts";
import { influencesOf, itemName, mapItemOverviewLineToNinjaItem } from "./to-item.ts";
import type { ItemOverviewLine } from "./get-item-overview.types.ts";

const line = (extra: Partial<ItemOverviewLine> = {}): ItemOverviewLine => ({
  id: 7,
  name: "Thing",
  chaosValue: 12,
  count: 50,
  listingCount: 400,
  ...extra,
});

describe("itemName", () => {
  describe("a unique priced at a roll", () => {
    it("puts the roll in brackets after the name, as PoeWatch spells it", () => {
      const name = itemName(line({ name: "Headhunter", variant: "Culling" }), TYPE_RULES.UniqueAccessory);

      expect(name).toBe("Headhunter (Culling)");
    }); // variant naming

    it("leaves a unique with an empty roll unbracketed", () => {
      const name = itemName(line({ name: "Headhunter", variant: "" }), TYPE_RULES.UniqueAccessory);

      expect(name).toBe("Headhunter");
    }); // "" is no roll, never "Headhunter ()"
  });

  describe("an item whose name lives in its base", () => {
    it("names a cluster jewel by its base rather than its enchantment", () => {
      const name = itemName(line({ name: "Enchant", baseType: "Large Cluster Jewel" }), TYPE_RULES.ClusterJewel);

      expect(name).toBe("Large Cluster Jewel");
    }); // name is a label the ground never shows

    it("falls back to the name when a cluster jewel row carries no base", () => {
      const name = itemName(line({ name: "Enchant" }), TYPE_RULES.ClusterJewel);

      expect(name).toBe("Enchant");
    }); // ?? fallback
  });

  describe("an item that is a base plus a roll", () => {
    it("joins a scrying orb's base with its region in brackets", () => {
      const name = itemName(line({ name: "Vaal Pyramid", baseType: "Scrying Orb" }), TYPE_RULES.ScryingOrb);

      expect(name).toBe("Scrying Orb (Vaal Pyramid)");
    }); // base-roll naming

    it("drops the roll's own trailing brackets so they never nest", () => {
      const name = itemName(
        line({ name: "Locus of Corruption (Tier 3)", baseType: "Chronicle of Atzoatl" }),
        TYPE_RULES.IncursionTemple,
      );

      expect(name).toBe("Chronicle of Atzoatl (Locus of Corruption)");
    }); // nested parens defeat a bracket-free stripper

    it("keeps the bare name when the row carries no base", () => {
      const name = itemName(line({ name: "Vaal Pyramid" }), TYPE_RULES.ScryingOrb);

      expect(name).toBe("Vaal Pyramid");
    }); // no base, no brackets
  });

  describe("a gem", () => {
    it("rebuilds a bracketed Vaal transfiguration from the last ' of ' inside the bracket", () => {
      const name = itemName(
        line({ name: "Vaal Rain of Arrows (Rain of Arrows of Saturation)", baseType: "Vaal Rain of Arrows" }),
        TYPE_RULES.SkillGem,
      );

      expect(name).toBe("Vaal Rain of Arrows of Saturation");
    }); // the first ' of ' would double "of Arrows"

    it("uses the text outside the bracket as the base when the row carries none", () => {
      const name = itemName(line({ name: "Vaal Cold Snap (Cold Snap of Power)" }), TYPE_RULES.SkillGem);

      expect(name).toBe("Vaal Cold Snap of Power");
    }); // outer group stands in for baseType

    it("falls back to the gem outside the bracket when the bracket has no ' of ' to unpick", () => {
      const name = itemName(line({ name: "Vaal Spark (Weird)" }), TYPE_RULES.SkillGem);

      expect(name).toBe("Vaal Spark");
    }); // never returns the bracketed spelling

    it("leaves an unbracketed gem name alone", () => {
      const name = itemName(line({ name: "Cold Snap" }), TYPE_RULES.SkillGem);

      expect(name).toBe("Cold Snap");
    }); // regex misses, name returned
  });
});

describe("influencesOf", () => {
  it("writes Elder/Crusader as crusader,elder", () => {
    const influences = influencesOf(line({ variant: "Elder/Crusader" }), TYPE_RULES.BaseType);

    expect(influences).toBe("crusader,elder");
  }); // sorted so one claim is one string

  it("drops empty parts and the spaces around them", () => {
    const influences = influencesOf(line({ variant: " Shaper / /" }), TYPE_RULES.BaseType);

    expect(influences).toBe("shaper");
  }); // trailing slashes make empty parts

  it("reports no influence on a base with no roll", () => {
    const influences = influencesOf(line(), TYPE_RULES.BaseType);

    expect(influences).toBe("");
  }); // undefined variant

  it("never reads a unique's roll as an influence", () => {
    const influences = influencesOf(line({ variant: "Shaper" }), TYPE_RULES.UniqueArmour);

    expect(influences).toBe("");
  }); // only BaseType's variant is an influence
});

describe("mapItemOverviewLineToNinjaItem", () => {
  it("prices the one number as mean, min and max, and treats missing currency values as zero", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "Vial");

    expect(item).toMatchObject({ mean: 12, min: 12, max: 12, exalted: 0, divine: 0, icon: "", daily: 50 });
  }); // no spread is invented

  it("flags nine listings as low confidence", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ count: 9 }), "Vial");

    expect(item.lowConfidence).toBe(true);
  }); // one below the threshold

  it("trusts ten listings", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ count: 10 }), "Vial");

    expect(item.lowConfidence).toBe(false);
  }); // exactly at the threshold is enough

  it("keeps the gaps in the seven-day series but closes them in the history", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ sparkLine: { totalChange: 5, data: [1, null, 3] } }), "Vial");

    expect(item.change).toBe(5);
    expect(item.history).toEqual([1, 3]);
    expect(item.sevenDaysHistory).toEqual([1, null, 3]);
  }); // two views of one series

  it("carries no change and no history when the row has no series", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "Vial");

    expect([item.change, item.history, item.sevenDaysHistory]).toEqual([null, null, null]);
  }); // null, not []

  it("gives no implicits for an empty list", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ implicitModifiers: [] }), "UniqueArmour");

    expect(item.implicits).toBeNull();
  }); // empty reads like absent, PoeWatch's shape

  it("gives the modifier texts when the row has some", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ explicitModifiers: [{ text: "+1", optional: false }] }), "UniqueArmour");

    expect(item.explicits).toEqual(["+1"]);
  }); // only text survives

  it("reads level 86 on a crafting base as its item level", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ levelRequired: 86 }), "BaseType");

    expect(item.itemLevel).toBe(86);
  }); // levelRequired means ilvl here

  it("gives a crafting base with no level no item level", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "BaseType");

    expect(item.itemLevel).toBeNull();
  }); // ?? null

  it("ignores a unique's level 68 requirement rather than calling it an item level", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ levelRequired: 68 }), "UniqueArmour");

    expect(item.itemLevel).toBeNull();
  }); // same field, different meaning

  it("counts six links from the string \"6\"", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ links: "6" }), "UniqueArmour");

    expect(item.linkCount).toBe(6);
  }); // numeric string converted

  it("leaves the link count off a row whose links are empty", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ links: "" }), "UniqueArmour");

    expect("linkCount" in item).toBe(false);
  }); // "" is not Number("") === 0

  it("leaves the link count off a row whose links are not a number", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ links: "x" }), "UniqueArmour");

    expect("linkCount" in item).toBe(false);
  }); // NaN dropped

  it("gives a gem in the state it drops in level one, quality zero and uncorrupted", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "SkillGem");

    expect(item).toMatchObject({ gemLevel: 1, gemQuality: 0, gemIsCorrupted: false, category: "gem", frame: 4 });
  }); // absent quality is zero, not unknown

  it("gives gem fields to gems only", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "Vial");

    expect("gemLevel" in item).toBe(false);
  }); // key absent, not undefined

  it("gives a map a null tier even when the row claims tier 16", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ mapTier: 16 }), "Map");

    expect(item.mapTier).toBeNull();
  }); // tier is never read off poe.ninja

  it("gives anything that is not a map no tier at all", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "Vial");

    expect("mapTier" in item).toBe(false);
  }); // key only on maps

  it("stamps every row one slot big and with the type it was asked under", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ itemType: "Body Armour" }), "UniqueArmour");

    expect(item).toMatchObject({
      width: 1,
      height: 1,
      ninjaType: "UniqueArmour",
      group: "bodyarmour",
      category: "armour",
    });
  }); // the type, not itemClass, decides what the row is
});
