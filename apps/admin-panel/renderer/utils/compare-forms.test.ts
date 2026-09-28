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
  it("puts item level 86 before item level 80", () => { // descending, highest first
    const forms = [form({ itemLevel: 80 }), form({ itemLevel: 86 })];

    expect(forms.sort(compareForms).map((one) => one.itemLevel)).toEqual([86, 80]);
  });

  it("reads a missing item level as zero", () => { // so a form with level 1 still outranks it
    const forms = [form({}), form({ itemLevel: 1 })];

    expect(forms.sort(compareForms)[0]?.itemLevel).toBe(1);
  });

  it("decides on item level before link count", () => { // the first differing key wins
    const forms = [form({ itemLevel: 80, linkCount: 6 }), form({ itemLevel: 86, linkCount: 0 })];

    expect(forms.sort(compareForms)[0]?.itemLevel).toBe(86);
  });

  it("falls through to link count when the item levels tie", () => { // a tie moves on to the next key
    const forms = [form({ itemLevel: 86, linkCount: 5 }), form({ itemLevel: 86, linkCount: 6 })];

    expect(forms.sort(compareForms)[0]?.linkCount).toBe(6);
  });

  it("decides on map tier before daily listings", () => { // map tier is the last level key
    const forms = [form({ mapTier: 15, daily: 99 }), form({ mapTier: 16, daily: 1 })];

    expect(forms.sort(compareForms)[0]?.mapTier).toBe(16);
  });

  it("breaks a tie on every level by the most listed", () => { // daily is the final tiebreak
    const forms = [form({ daily: 1 }), form({ daily: 9 })];

    expect(forms.sort(compareForms)[0]?.daily).toBe(9);
  });

  it("ignores corruption and influence when ordering", () => { // they are not among the compared keys
    expect(compareForms(form({ gemIsCorrupted: true, influences: ["shaper"] }), form({}))).toBe(0);
  });
});
