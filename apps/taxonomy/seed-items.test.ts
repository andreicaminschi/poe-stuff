import { describe, expect, it } from "@jest/globals";
import type { BaseItems } from "@poe/repoe/get-base-items.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import { seedItems } from "./seed-items.ts";

const base = (name: string, itemClass: string) => ({ name, item_class: itemClass }) as unknown as BaseItems[string];
const gem = (gameId: string, baseTypeName?: string) => ({ gameId, baseTypeName }) as unknown as Gems[string];

describe("seedItems", () => {
  it("writes one row per base, named after it, classed by its item class, with no subcategory", () => {
    const table = seedItems({ Ring: base("Ruby Ring", "Ring") } as BaseItems, {} as Gems);

    expect(table).toEqual({
      Ring: { name: "Ruby Ring", displayName: "Ruby Ring", category: "Ring", subcategory: null },
    });
  });

  it("leaves out bases with no name and quest items", () => {
    const table = seedItems({ A: base("", "Ring"), B: base("Key", "QuestItem") } as BaseItems, {} as Gems);

    expect(table).toEqual({});
  });

  it.each(["[DNT] Ring", "Ring]", "WIP Ring", "MTX Ring"])("leaves out a junk name like %s", (name) => {
    expect(seedItems({ A: base(name, "Ring") } as BaseItems, {} as Gems)).toEqual({});
  });

  it("keeps names that merely contain the letters MTX or WIP", () => {
    expect(
      Object.keys(seedItems({ A: base("SWIPE", "Ring"), B: base("Ring WIP", "Ring") } as BaseItems, {} as Gems)),
    ).toEqual(["A"]);
  });

  it("adds a transfigured gem under its own key, classed by the base gem's item class", () => {
    const table = seedItems(
      { SkillGemFireball: base("Fireball", "Active Skill Gem") } as BaseItems,
      { FireballAlt: gem("SkillGemFireball", "Fireball of Rain") } as Gems,
    );

    expect(table.FireballAlt).toEqual({
      name: "Fireball of Rain",
      displayName: "Fireball of Rain",
      category: "Active Skill Gem",
      subcategory: null,
    });
  });

  it("does not add a gem whose key is already a base", () => {
    const table = seedItems(
      { SkillGemFireball: base("Fireball", "Active Skill Gem") } as BaseItems,
      { SkillGemFireball: gem("SkillGemFireball", "Other Name") } as Gems,
    );

    expect(table.SkillGemFireball?.name).toBe("Fireball");
  });

  it("does not add a gem with no base type name or no base it points at", () => {
    const table = seedItems({} as BaseItems, { A: gem("SkillGemX", "X"), B: gem("SkillGemFireball") } as Gems);

    expect(table).toEqual({});
  });

  it("does not add a transfigured gem whose base is a quest item, even when the base itself was left out", () => {
    const table = seedItems({ Q: base("", "QuestItem") } as BaseItems, { G: gem("Q", "Gem") } as Gems);

    expect(table).toEqual({});
  });
});
