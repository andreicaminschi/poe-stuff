import { describe, it, expect } from "@jest/globals";
import type { Form } from "../../api/panel-api.ts";
import { formToVariant } from "./form-to-variant.ts";

const form = (overrides: Partial<Form>): Form => ({
  query: { name: "Ghastly Eye Jewel" },
  frame: 0,
  influences: [],
  synthesised: false,
  mean: 1,
  daily: 1,
  lowConfidence: false,
  ...overrides,
});

describe("formToVariant", () => {
  it("names and conditions the item level the siblings disagree on, and keeps the whole query", () => {
    const query = { name: "Ghastly Eye Jewel", frame: 0, itemLevel: 86, synthesised: false };
    const high = form({ itemLevel: 86, query });
    const siblings = [form({ itemLevel: 83 }), form({ itemLevel: 83, synthesised: true }), high];

    expect(formToVariant(high, siblings)).toEqual({
      name: "ilvl 86",
      listing: query,
      conditions: [
        { condition: "Rarity", operator: "==", value: "Normal" },
        { condition: "ItemLevel", operator: ">=", value: 86 },
        { condition: "SynthesisedItem", value: false },
      ],
    });
  });

  it("bounds a lower item level below the next form up", () => {
    const mid = form({ itemLevel: 84 });
    const siblings = [form({ itemLevel: 83 }), mid, form({ itemLevel: 86 })];

    expect(formToVariant(mid, siblings).conditions).toEqual([
      { condition: "Rarity", operator: "==", value: "Normal" },
      { condition: "ItemLevel", operator: ">=", value: 84 },
      { condition: "ItemLevel", operator: "<=", value: 85 },
    ]);
  });

  it("marks a synthesised form", () => {
    const synth = form({ itemLevel: 83, synthesised: true });
    const variant = formToVariant(synth, [form({ itemLevel: 83 }), synth]);

    expect(variant.name).toBe("synth");
    expect(variant.conditions).toContainEqual({ condition: "SynthesisedItem", value: true });
  });

  it("gives a lone form only its rarity", () => {
    const only = form({ itemLevel: 84 });

    expect(formToVariant(only, [only])).toEqual({
      name: "normal",
      listing: only.query,
      conditions: [{ condition: "Rarity", operator: "==", value: "Normal" }],
    });
  });

  it("names the influence and asks for None on the plain form", () => {
    const plain = form({});
    const shaper = form({ influences: ["shaper", "elder"] });

    expect(formToVariant(shaper, [plain, shaper]).conditions).toContainEqual({
      condition: "HasInfluence",
      value: ["Shaper", "Elder"],
    });
    expect(formToVariant(shaper, [plain, shaper]).name).toBe("shaper/elder");
    expect(formToVariant(plain, [plain, shaper]).conditions).toContainEqual({
      condition: "HasInfluence",
      value: ["None"],
    });
  });

  it("writes a gem's level and corruption, and no rarity for a gem frame", () => {
    const corrupt = form({ frame: 4, gemLevel: 21, gemQuality: 20, gemIsCorrupted: true });
    const clean = form({ frame: 4, gemLevel: 20, gemQuality: 20, gemIsCorrupted: false });

    expect(formToVariant(corrupt, [corrupt, clean])).toEqual({
      name: "L21 corrupted",
      listing: corrupt.query,
      conditions: [
        { condition: "GemLevel", operator: ">=", value: 21 },
        { condition: "Corrupted", value: true },
      ],
    });
  });
});
