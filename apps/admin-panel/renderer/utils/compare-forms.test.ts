import { describe, it, expect } from "@jest/globals";
import type { Form } from "../../api/panel-api.ts";
import { compareForms } from "./compare-forms.ts";

const form = (over: Partial<Form>): Form => ({
  query: {},
  frame: 0,
  influences: [],
  synthesised: false,
  mean: 0,
  daily: 0,
  lowConfidence: false,
  ...over,
});

describe("compareForms", () => {
  it("puts the higher item level first", () => {
    const forms = [form({ itemLevel: 80 }), form({ itemLevel: 86 })];

    expect(forms.sort(compareForms).map((one) => one.itemLevel)).toEqual([86, 80]);
  });

  it("reads a missing item level as zero", () => {
    const forms = [form({}), form({ itemLevel: 1 })];

    expect(forms.sort(compareForms)[0]?.itemLevel).toBe(1);
  });

  it("decides on item level before link count", () => {
    const forms = [form({ itemLevel: 80, linkCount: 6 }), form({ itemLevel: 86, linkCount: 0 })];

    expect(forms.sort(compareForms)[0]?.itemLevel).toBe(86);
  });

  it("breaks a tie on every level by the most listed", () => {
    const forms = [form({ daily: 1 }), form({ daily: 9 })];

    expect(forms.sort(compareForms)[0]?.daily).toBe(9);
  });

  it("ignores corruption and influence when ordering", () => {
    expect(compareForms(form({ gemIsCorrupted: true, influences: ["shaper"] }), form({}))).toBe(0);
  });
});
