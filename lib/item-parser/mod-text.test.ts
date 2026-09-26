import { describe, it, expect } from "@jest/globals";
import { derollText, invertScaling, readRolls, stripUnscalable } from "./mod-text.ts";

describe("derollText", () => {
  it("removes each bracketed range and keeps the rolled value", () => {
    expect(derollText("Adds 3(2-4) to 7(6-8) Cold Damage")).toBe("Adds 3 to 7 Cold Damage");
  });

  it("handles negative ranges and decimals", () => {
    expect(derollText("-10(-25--15)% and 1.5(1-2)")).toBe("-10% and 1.5");
  });

  it("leaves a bare number untouched", () => {
    expect(derollText("+2 to Level of Socketed Support Gems")).toBe("+2 to Level of Socketed Support Gems");
  });
});

describe("readRolls", () => {
  it("reads every roll in printed order", () => {
    expect(readRolls("+149(145-159) to maximum Life, 1.5(1-2)")).toEqual([
      { value: 149, min: 145, max: 159 },
      { value: 1.5, min: 1, max: 2 },
    ]);
  });

  it("sorts a backwards range so min is the smaller", () => {
    expect(readRolls("22(25-20)% reduced")).toEqual([{ value: 22, min: 20, max: 25 }]);
  });

  it("reads a range between two negatives", () => {
    expect(readRolls("-10(-25--15)")).toEqual([{ value: -10, min: -25, max: -15 }]);
  });

  it("reads nothing from a line without brackets", () => {
    expect(readRolls("for 4 seconds")).toEqual([]);
  });
});

describe("stripUnscalable", () => {
  it("removes a trailing unscalable note and reports it", () => {
    expect(stripUnscalable("Can be Anointed up to 3 times — Unscalable Value")).toEqual({
      text: "Can be Anointed up to 3 times",
      unscalable: true,
    });
  });

  it("leaves a note in the middle of a line alone", () => {
    expect(stripUnscalable("x — Unscalable Value y").unscalable).toBe(false);
  });
});

describe("invertScaling", () => {
  it("rewrites reduced as increased with a negative value", () => {
    expect(invertScaling("28% reduced Charges per use")).toBe("-28% increased Charges per use");
  });

  it("rewrites less as more with a negative value", () => {
    expect(invertScaling("10% less Damage")).toBe("-10% more Damage");
  });

  it("flips an already negative number to positive", () => {
    expect(invertScaling("-5% reduced Cost")).toBe("5% increased Cost");
  });

  it("rewrites a non-percent value too", () => {
    expect(invertScaling("5 reduced Mana")).toBe("-5 increased Mana");
  });

  it("returns undefined when nothing needs flipping", () => {
    expect(invertScaling("28% increased Charges per use")).toBeUndefined();
  });
});
