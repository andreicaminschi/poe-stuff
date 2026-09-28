import { describe, expect, it } from "@jest/globals";
import type { Gems } from "@poe/repoe/get-gems.types";
import type { TaxonomyTable } from "../types.ts";
import { gemVariants } from "./gem-variants.ts";

const gemRow = { name: "Fireball", category: "skill-gems", subcategory: null };
const gem = (naturalMaxLevel: number, extra: Record<string, unknown> = {}) =>
  ({ gameId: "SkillGemFireball", naturalMaxLevel, ...extra }) as unknown as Gems[string];
const namesOf = (items: TaxonomyTable, gems: Gems, key = "SkillGemFireball") =>
  gemVariants(items, gems)[key]?.map((variant) => variant.name);

describe("gemVariants", () => {
  it("writes three uncorrupted forms and four corrupted ones for a normal gem", () => {
    expect(namesOf({ SkillGemFireball: gemRow }, { SkillGemFireball: gem(20) } as Gems)).toEqual([
      "1/0",
      "1/20",
      "20/20",
      "20/20 corrupted",
      "21/20 corrupted",
      "20/23 corrupted",
      "21/23 corrupted",
    ]);
  }); // the max level comes from the export, not a constant 20

  it("writes only corrupted forms for a Vaal gem, without the double outcome", () => {
    expect(namesOf({ SkillGemFireball: gemRow }, { SkillGemFireball: gem(20, { vaalGem: true }) } as Gems)).toEqual([
      "1/0 corrupted",
      "1/20 corrupted",
      "20/20 corrupted",
      "21/20 corrupted",
      "20/23 corrupted",
    ]);
  }); // a Vaal gem cannot exist uncorrupted, and 21/23 would need two corruptions

  it("drops the repeated 1/20 form for a gem whose max level is one", () => {
    expect(namesOf({ SkillGemFireball: gemRow }, { SkillGemFireball: gem(1) } as Gems)).toEqual([
      "1/0",
      "1/20",
      "1/20 corrupted",
      "2/20 corrupted",
      "1/23 corrupted",
      "2/23 corrupted",
    ]);
  }); // max 1 makes "1/20" and "max/20" the same name

  it("writes each form's conditions and PoeWatch listing", () => {
    const [first] =
      gemVariants({ SkillGemFireball: gemRow }, { SkillGemFireball: gem(20) } as Gems).SkillGemFireball ?? [];

    expect(first).toEqual({
      name: "1/0",
      conditions: [
        { condition: "GemLevel", operator: "==", value: 1 },
        { condition: "Quality", operator: "==", value: 0 },
        { condition: "Corrupted", value: false },
      ],
      listing: { gemLevel: 1, gemQuality: 0, gemIsCorrupted: false },
    });
  });

  it("finds a gem by its game id when the export keys it differently", () => {
    const names = namesOf({ SkillGemFireball: gemRow }, { SkillGemFireballNew: gem(20) } as Gems);

    expect(names).toHaveLength(7);
  }); // Convocation is keyed ...New in the export

  it("prefers the gem under the row's own key over one found by game id", () => {
    const gems = { SkillGemFireballNew: gem(20), SkillGemFireball: gem(1, { gameId: "Other" }) } as Gems;

    const names = namesOf({ SkillGemFireball: gemRow }, gems);

    expect(names).toHaveLength(6);
  }); // six forms means the max-1 gem won

  it("skips rows that are not skill gems, and gems the export does not have", () => {
    const items = { SkillGemFireball: { ...gemRow, category: "support-gems" }, Graft: { ...gemRow, name: "Graft" } };

    const table = gemVariants(items, { SkillGemFireball: gem(20) } as Gems);

    expect(table).toEqual({});
  }); // a graft gem gets no key at all, not an empty list
});
