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
  it("marks a synthesised form", () => {
    const synth = form({ itemLevel: 83, synthesised: true });
    const variant = formToVariant(synth, [form({ itemLevel: 83 }), synth]);

    expect(variant.name).toBe("synth");
    expect(variant.conditions).toContainEqual({ condition: "SynthesisedItem", value: true });
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
