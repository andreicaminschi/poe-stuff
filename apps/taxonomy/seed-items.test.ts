import { describe, it, expect } from "@jest/globals";
import type { BaseItems } from "@poe/repoe/get-base-items.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import { seedItems } from "./seed-items.ts";

const bases = {
  "Metadata/Items/Currency/CurrencyRerollRare": { name: "Chaos Orb", item_class: "StackableCurrency" },
  "Metadata/Items/Gems/SkillGemFireball": { name: "Fireball", item_class: "Active Skill Gem" },
  "Metadata/Items/Gems/SupportGemAddedFire": { name: "Added Fire Damage Support", item_class: "Support Skill Gem" },
  "Metadata/Items/Currency/RandomFossilOutcome1": { name: "", item_class: "StackableCurrency" },
} as unknown as BaseItems;

const gems = {
  "Metadata/Items/Gems/SkillGemFireball": {
    gameId: "Metadata/Items/Gems/SkillGemFireball",
    baseTypeName: "Fireball",
  },
  "Metadata/Items/Gems/SkillGemFireballAltX": {
    gameId: "Metadata/Items/Gems/SkillGemFireball",
    baseTypeName: "Fireball of Starfall",
  },
  "Metadata/Items/Gems/SupportGemAddedFire": { gameId: "Metadata/Items/Gems/SupportGemAddedFire" },
  "Metadata/Items/Gems/SkillGemOrphanAltX": { gameId: "Metadata/Items/Gems/Missing", baseTypeName: "Orphan" },
} as unknown as Gems;

describe("seedItems", () => {
  const table = seedItems(bases, gems);

  it("files a base under its item class", () => {
    expect(table["Metadata/Items/Currency/CurrencyRerollRare"]).toEqual({
      name: "Chaos Orb",
      category: "StackableCurrency",
      subcategory: null,
    });
  });

  it("files a transfigured gem under its base gem's class", () => {
    expect(table["Metadata/Items/Gems/SkillGemFireballAltX"]).toEqual({
      name: "Fireball of Starfall",
      category: "Active Skill Gem",
      subcategory: null,
    });
  });

  it("keeps the base row for an ordinary gem", () => {
    expect(table["Metadata/Items/Gems/SkillGemFireball"]?.name).toBe("Fireball");
    expect(table["Metadata/Items/Gems/SupportGemAddedFire"]?.name).toBe("Added Fire Damage Support");
  });

  it("skips a base with no name", () => {
    expect(table["Metadata/Items/Currency/RandomFossilOutcome1"]).toBeUndefined();
  });

  it("skips a gem whose base is unknown", () => {
    expect(table["Metadata/Items/Gems/SkillGemOrphanAltX"]).toBeUndefined();
    expect(Object.keys(table)).toHaveLength(4);
  });
});
