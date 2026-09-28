import { describe, it, expect } from "@jest/globals";
import type { Form } from "../../api/panel-api.ts";
import { formToVariant } from "./form-to-variant.ts";

const form = (over: Partial<Form>): Form => ({
  query: { name: "q" },
  frame: 2,
  influences: [],
  synthesised: false,
  mean: 0,
  daily: 0,
  lowConfidence: false,
  ...over,
});

describe("formToVariant", () => {
  it("names a form with no differing siblings after its rarity and lets every non-unique rarity through", () => { // the listing is the form's whole query
    const one = form({});

    expect(formToVariant(one, [one])).toEqual({
      name: "rare",
      conditions: [{ condition: "Rarity", operator: "==", value: ["Normal", "Magic", "Rare"] }],
      listing: { name: "q" },
    });
  });

  it("pins a unique form to Unique", () => { // uniques are always told apart
    const one = form({ frame: 3 });

    expect(formToVariant(one, [one]).conditions).toEqual([{ condition: "Rarity", operator: "==", value: ["Unique"] }]);
  });

  it("pins the rarity when a non-unique sibling has another rarity", () => { // magic next to rare must be split
    const one = form({ frame: 1 });

    expect(formToVariant(one, [one, form({ frame: 2 })]).conditions[0]).toEqual({
      condition: "Rarity",
      operator: "==",
      value: ["Magic"],
    });
  });

  it("still lets every non-unique rarity through when the only other rarity is Unique", () => { // a unique sibling does not count
    const one = form({ frame: 2 });

    expect(formToVariant(one, [one, form({ frame: 3 })]).conditions[0]?.value).toEqual(["Normal", "Magic", "Rare"]);
  });

  it("writes no Rarity at all for a frame that is not a rarity, and calls it variant", () => { // frame 9 has no rarity name
    const one = form({ frame: 9 });

    expect(formToVariant(one, [one])).toMatchObject({ name: "variant", conditions: [] });
  });

  it("bounds item level 82 at 83 when the next sibling up is 84", () => { // the nearest level above, minus one, not the highest
    const one = form({ itemLevel: 82 });
    const siblings = [one, form({ itemLevel: 86 }), form({ itemLevel: 84 }), form({ itemLevel: 75 })];

    const variant = formToVariant(one, siblings);

    expect(variant.conditions.slice(1)).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 82 },
      { condition: "ItemLevel", operator: "<=", value: 83 },
    ]);
    expect(variant.name).toBe("ilvl 82");
  });

  it("leaves the top item level open-ended", () => { // no level above means no ceiling
    const one = form({ itemLevel: 86 });

    expect(formToVariant(one, [one, form({ itemLevel: 82 })]).conditions.slice(1)).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 86 },
    ]);
  });

  it("writes a condition only for what the siblings disagree on", () => { // equal gem levels write nothing
    const one = form({ linkCount: 6, gemLevel: 20 });

    const variant = formToVariant(one, [one, form({ linkCount: 5, gemLevel: 20 })]);

    expect(variant.conditions.slice(1)).toEqual([{ condition: "LinkedSockets", operator: ">=", value: 6 }]);
    expect(variant.name).toBe("6L");
  });

  it("writes gem corruption with no operator and labels a clean gem", () => { // false is still a value worth writing
    const one = form({ gemIsCorrupted: false });

    const variant = formToVariant(one, [one, form({ gemIsCorrupted: true })]);

    expect(variant.conditions.slice(1)).toEqual([{ condition: "Corrupted", value: false }]);
    expect(variant.name).toBe("clean");
  });

  it("matches a map tier exactly", () => { // == rather than >=, unlike the other numbers
    const one = form({ mapTier: 16 });

    expect(formToVariant(one, [one, form({ mapTier: 15 })]).conditions.slice(1)).toEqual([
      { condition: "MapTier", operator: "==", value: 16 },
    ]);
  });

  it("writes the form's influences title-cased and labels them as written", () => { // condition is Shaper, label is shaper
    const one = form({ influences: ["shaper", "elder"] });

    const variant = formToVariant(one, [one, form({ influences: [] })]);

    expect(variant.conditions.slice(1)).toEqual([{ condition: "HasInfluence", value: ["Shaper", "Elder"] }]);
    expect(variant.name).toBe("shaper/elder");
  });

  it("writes None for an uninfluenced form among influenced siblings and gives it no label", () => { // falls back to the rarity name
    const one = form({ influences: [] });

    const variant = formToVariant(one, [one, form({ influences: ["shaper"] })]);

    expect(variant.conditions.slice(1)).toEqual([{ condition: "HasInfluence", value: ["None"] }]);
    expect(variant.name).toBe("rare");
  });

  it("treats the same influences in another order as no difference", () => { // compared sorted
    const one = form({ influences: ["elder", "shaper"] });

    expect(formToVariant(one, [one, form({ influences: ["shaper", "elder"] })]).conditions).toHaveLength(1);
  });

  it("writes synthesis when the siblings disagree and labels only a synthesised form", () => { // the plain side gets no word
    const one = form({ synthesised: true });

    const variant = formToVariant(one, [one, form({ synthesised: false })]);

    expect(variant.conditions.slice(1)).toEqual([{ condition: "SynthesisedItem", value: true }]);
    expect(variant.name).toBe("synth");
  });

  it("joins several labels with spaces", () => { // field labels first, then synth
    const one = form({ itemLevel: 86, synthesised: true });

    expect(formToVariant(one, [one, form({ itemLevel: 80, synthesised: false })]).name).toBe("ilvl 86 synth");
  });

  it("treats an empty sibling list as no disagreement", () => { // some() over nothing is false
    expect(formToVariant(form({ itemLevel: 86 }), []).name).toBe("rare");
  });
});
