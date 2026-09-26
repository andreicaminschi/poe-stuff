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
  it("puts a unique's roll in brackets after its name", () => {
    expect(itemName(line({ name: "Headhunter", variant: "Culling" }), TYPE_RULES.UniqueAccessory)).toBe(
      "Headhunter (Culling)",
    );
  });

  it("leaves a unique with an empty roll unbracketed", () => {
    expect(itemName(line({ name: "Headhunter", variant: "" }), TYPE_RULES.UniqueAccessory)).toBe("Headhunter");
  });

  it("names a cluster jewel by its base, falling back to the name when the base is missing", () => {
    expect(itemName(line({ name: "Enchant", baseType: "Large Cluster Jewel" }), TYPE_RULES.ClusterJewel)).toBe(
      "Large Cluster Jewel",
    );
    expect(itemName(line({ name: "Enchant" }), TYPE_RULES.ClusterJewel)).toBe("Enchant");
  });

  it("joins a scrying orb's base with its region in brackets", () => {
    expect(itemName(line({ name: "Vaal Pyramid", baseType: "Scrying Orb" }), TYPE_RULES.ScryingOrb)).toBe(
      "Scrying Orb (Vaal Pyramid)",
    );
  });

  it("drops the roll's own trailing brackets so they never nest", () => {
    expect(
      itemName(line({ name: "Locus of Corruption (Tier 3)", baseType: "Chronicle of Atzoatl" }), TYPE_RULES.IncursionTemple),
    ).toBe("Chronicle of Atzoatl (Locus of Corruption)");
  });

  it("keeps the bare name of a base-and-roll row that has no base", () => {
    expect(itemName(line({ name: "Vaal Pyramid" }), TYPE_RULES.ScryingOrb)).toBe("Vaal Pyramid");
  });

  it("rebuilds a bracketed Vaal transfiguration from the last ' of ' inside the bracket", () => {
    expect(
      itemName(line({ name: "Vaal Rain of Arrows (Rain of Arrows of Saturation)", baseType: "Vaal Rain of Arrows" }), TYPE_RULES.SkillGem),
    ).toBe("Vaal Rain of Arrows of Saturation");
  });

  it("uses the text outside the bracket as the base when the row carries none", () => {
    expect(itemName(line({ name: "Vaal Cold Snap (Cold Snap of Power)" }), TYPE_RULES.SkillGem)).toBe(
      "Vaal Cold Snap of Power",
    );
  });

  it("falls back to the plain gem when the bracket has no ' of ' to unpick", () => {
    expect(itemName(line({ name: "Vaal Spark (Weird)" }), TYPE_RULES.SkillGem)).toBe("Vaal Spark");
  });

  it("leaves an unbracketed gem name alone", () => {
    expect(itemName(line({ name: "Cold Snap" }), TYPE_RULES.SkillGem)).toBe("Cold Snap");
  });
});

describe("influencesOf", () => {
  it("lowercases, sorts and comma-joins a base's influences", () => {
    expect(influencesOf(line({ variant: "Elder/Crusader" }), TYPE_RULES.BaseType)).toBe("crusader,elder");
  });

  it("drops empty parts and surrounding spaces", () => {
    expect(influencesOf(line({ variant: " Shaper / /" }), TYPE_RULES.BaseType)).toBe("shaper");
  });

  it("reports no influence on a base with no roll", () => {
    expect(influencesOf(line(), TYPE_RULES.BaseType)).toBe("");
  });

  it("never reads a unique's roll as an influence", () => {
    expect(influencesOf(line({ variant: "Shaper" }), TYPE_RULES.UniqueArmour)).toBe("");
  });
});

describe("mapItemOverviewLineToNinjaItem", () => {
  it("prices one number as mean, min and max and defaults missing currency values to zero", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "Vial");

    expect(item).toMatchObject({ mean: 12, min: 12, max: 12, exalted: 0, divine: 0, icon: "", daily: 50 });
  });

  it("flags nine listings as low confidence and ten as enough", () => {
    expect(mapItemOverviewLineToNinjaItem(line({ count: 9 }), "Vial").lowConfidence).toBe(true);
    expect(mapItemOverviewLineToNinjaItem(line({ count: 10 }), "Vial").lowConfidence).toBe(false);
  });

  it("keeps nulls in the seven-day series but drops them from the history", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ sparkLine: { totalChange: 5, data: [1, null, 3] } }), "Vial");

    expect(item.change).toBe(5);
    expect(item.history).toEqual([1, 3]);
    expect(item.sevenDaysHistory).toEqual([1, null, 3]);
  });

  it("carries null change and history when the row has no series", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "Vial");

    expect([item.change, item.history, item.sevenDaysHistory]).toEqual([null, null, null]);
  });

  it("gives null modifiers for a missing or empty list and the texts otherwise", () => {
    const item = mapItemOverviewLineToNinjaItem(
      line({ implicitModifiers: [], explicitModifiers: [{ text: "+1", optional: false }] }),
      "UniqueArmour",
    );

    expect(item.implicits).toBeNull();
    expect(item.explicits).toEqual(["+1"]);
  });

  it("reads the level as an item level on a base and ignores it on a unique", () => {
    expect(mapItemOverviewLineToNinjaItem(line({ levelRequired: 86 }), "BaseType").itemLevel).toBe(86);
    expect(mapItemOverviewLineToNinjaItem(line(), "BaseType").itemLevel).toBeNull();
    expect(mapItemOverviewLineToNinjaItem(line({ levelRequired: 68 }), "UniqueArmour").itemLevel).toBeNull();
  });

  it("counts links from a string, and omits links that are empty or not a number", () => {
    expect(mapItemOverviewLineToNinjaItem(line({ links: "6" }), "UniqueArmour").linkCount).toBe(6);
    expect("linkCount" in mapItemOverviewLineToNinjaItem(line({ links: "" }), "UniqueArmour")).toBe(false);
    expect("linkCount" in mapItemOverviewLineToNinjaItem(line({ links: "x" }), "UniqueArmour")).toBe(false);
  });

  it("gives a gem that dropped as-is level one, quality zero and uncorrupted", () => {
    const item = mapItemOverviewLineToNinjaItem(line(), "SkillGem");

    expect(item).toMatchObject({ gemLevel: 1, gemQuality: 0, gemIsCorrupted: false, category: "gem", frame: 4 });
  });

  it("gives gem fields to gems only", () => {
    expect("gemLevel" in mapItemOverviewLineToNinjaItem(line(), "Vial")).toBe(false);
  });

  it("gives maps a null tier and nothing else a tier at all", () => {
    expect(mapItemOverviewLineToNinjaItem(line({ mapTier: 16 }), "Map").mapTier).toBeNull();
    expect("mapTier" in mapItemOverviewLineToNinjaItem(line(), "Vial")).toBe(false);
  });

  it("stamps every row one slot big and with the type it was asked under", () => {
    const item = mapItemOverviewLineToNinjaItem(line({ itemType: "Body Armour" }), "UniqueArmour");

    expect(item).toMatchObject({ width: 1, height: 1, ninjaType: "UniqueArmour", group: "bodyarmour", category: "armour" });
  });
});
