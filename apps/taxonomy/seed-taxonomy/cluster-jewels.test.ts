import { describe, expect, it } from "@jest/globals";
import type { ClusterJewels } from "@poe/repoe/get-cluster-jewels.types";
import { clusterJewelVariants } from "./cluster-jewels.ts";

const jewel = (size: string, statText: readonly string[] = ["10% increased Fire Damage"]) =>
  ({
    Small: {
      size,
      name: "Small Cluster Jewel",
      passive_skills: [{ name: "Fire Damage", stat_text: statText }],
    },
  }) as unknown as ClusterJewels;

describe("clusterJewelVariants", () => {
  it("crosses each enchant with every passive bucket and all five item level buckets", () => {
    const variants = clusterJewelVariants(jewel("Small")).Small ?? [];

    expect(variants.map((variant) => variant.name)).toEqual([
      "Fire Damage, 2 passives, ilvl 1",
      "Fire Damage, 2 passives, ilvl 50",
      "Fire Damage, 2 passives, ilvl 68",
      "Fire Damage, 2 passives, ilvl 75",
      "Fire Damage, 2 passives, ilvl 84",
      "Fire Damage, 3 passives, ilvl 1",
      "Fire Damage, 3 passives, ilvl 50",
      "Fire Damage, 3 passives, ilvl 68",
      "Fire Damage, 3 passives, ilvl 75",
      "Fire Damage, 3 passives, ilvl 84",
    ]);
  }); // passive bucket is the outer loop, item level the inner

  it("asks for the lowest item level bucket with an upper bound only", () => {
    const [first] = clusterJewelVariants(jewel("Small")).Small ?? [];

    expect(first?.conditions).toEqual([
      { condition: "EnchantmentPassiveNode", value: ["Fire Damage"] },
      { condition: "EnchantmentPassiveNum", operator: "==", value: 2 },
      { condition: "ItemLevel", operator: "<=", value: 49 },
    ]);
  }); // bucket 1 is labelled 1 but asks for 49 and under

  it("asks for the item level 84 bucket with a lower bound only", () => {
    const variant = clusterJewelVariants(jewel("Small")).Small?.[4];

    expect(variant?.conditions.slice(2)).toEqual([{ condition: "ItemLevel", operator: ">=", value: 84 }]);
  }); // open-ended at the top

  it("asks for a middle item level bucket with both bounds", () => {
    const variant = clusterJewelVariants(jewel("Small")).Small?.[2];

    expect(variant?.conditions.slice(2)).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 68 },
      { condition: "ItemLevel", operator: "<=", value: 74 },
    ]);
  }); // 74, not 75: buckets must not overlap

  it("turns the large jewel's 9-11 bucket into a range of passives", () => {
    const variant = clusterJewelVariants(jewel("Large")).Small?.find((one) => one.name.includes("9-11"));

    expect(variant?.conditions.slice(1, 3)).toEqual([
      { condition: "EnchantmentPassiveNum", operator: ">=", value: 9 },
      { condition: "EnchantmentPassiveNum", operator: "<=", value: 11 },
    ]);
  }); // the dash splits into both ends

  it("gives a medium jewel three passive buckets times five item levels", () => {
    const variants = clusterJewelVariants(jewel("Medium")).Small;

    expect(variants).toHaveLength(15);
  });

  it("lists under the jewel name with the enchant lines joined by a newline", () => {
    const [first] = clusterJewelVariants(jewel("Small", ["line one", "line two"])).Small ?? [];

    expect(first?.listing).toEqual({ name: "Small Cluster Jewel (line one\nline two)", passives: "2", itemLevel: 1 });
  }); // RePoE's line order; the catalog flips it for PoeWatch

  it("refuses a size it has no passive buckets for", () => {
    expect(() => clusterJewelVariants(jewel("Huge"))).toThrow(
      "cluster jewel Small: no passive buckets for size \"Huge\"",
    );
  }); // a fourth size throws rather than being skipped

  it("writes an empty list for a jewel with no enchants", () => {
    const jewels = {
      Small: { size: "Small", name: "Small Cluster Jewel", passive_skills: [] },
    } as unknown as ClusterJewels;

    const table = clusterJewelVariants(jewels);

    expect(table).toEqual({ Small: [] });
  }); // the key is still written, so a stale seeded list is cleared
});
