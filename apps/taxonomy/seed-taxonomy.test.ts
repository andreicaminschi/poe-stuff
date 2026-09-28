import { describe, expect, it } from "@jest/globals";
import type { ClusterJewels } from "@poe/repoe/get-cluster-jewels.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import type { RepoeService } from "@poe/repoe/service";
import { seedTaxonomy } from "./seed-taxonomy.ts";

const repoeOf = (gems: unknown, clusterJewels: unknown) =>
  ({
    getGems: async () => gems as Gems,
    getClusterJewels: async () => clusterJewels as ClusterJewels,
  }) as unknown as RepoeService;

const items = { SkillGemFireball: { name: "Fireball", category: "skill-gems", subcategory: null } };
const gems = { SkillGemFireball: { gameId: "SkillGemFireball", naturalMaxLevel: 20 } };
const jewels = {
  Small: { size: "Small", name: "Small Cluster Jewel", passive_skills: [{ name: "Fire", stat_text: ["x"] }] },
};

describe("seedTaxonomy", () => {
  it("runs every seed and counts the keys each one wrote", async () => {
    const seeded = await seedTaxonomy(items, repoeOf(gems, jewels));

    expect(seeded.counts).toEqual({
      gems: { variants: 1, authored: 0 },
      "cluster-jewels": { variants: 1, authored: 0 },
    });
    expect(Object.keys(seeded.variants)).toEqual(["SkillGemFireball", "Small"]);
    expect(seeded.authored).toEqual({});
  });

  it("joins two seeds' variants on one key in seed order", async () => {
    const shared = { Small: { name: "Small", category: "skill-gems", subcategory: null } };
    const gemsOnSmall = { Small: { gameId: "Small", naturalMaxLevel: 20 } };

    const seeded = await seedTaxonomy(shared, repoeOf(gemsOnSmall, jewels));

    const names = seeded.variants.Small?.map((variant) => variant.name) ?? [];
    expect(names).toHaveLength(7 + 10);
    expect(names[0]).toBe("1/0");
    expect(names[7]).toBe("Fire, 2 passives, ilvl 1");
  });

  it("passes on a failure from RePoE", async () => {
    const repoe = {
      getGems: async () => {
        throw new Error("offline");
      },
      getClusterJewels: async () => ({}),
    } as unknown as RepoeService;

    await expect(seedTaxonomy(items, repoe)).rejects.toThrow("offline");
  });
});
