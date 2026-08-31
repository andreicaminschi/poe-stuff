import { describe, it, expect } from "@jest/globals";
import { derollText, invertScaling, readRolls, stripUnscalable } from "./mod-text.ts";

/**
 * The one place the game and the trade API disagree, and the rules that close the gap.
 *
 * Every case here is a line the game actually printed on one of the sample items, or the
 * shape of one. The awkward ones are real: the game writes a downside's range backwards,
 * and it writes a negative range with four minus signs in a row.
 */

describe("derollText", () => {
  it("leaves the rolled value and drops the range it rolled in", () => {
    expect(derollText("+149(145-159) to maximum Life")).toBe("+149 to maximum Life");
  });

  it("drops every range on a line with more than one", () => {
    expect(derollText("1(1-3) to 28(28-30) Added Lightning Damage with Bow Attacks")).toBe(
      "1 to 28 Added Lightning Damage with Bow Attacks",
    );
  });

  it("handles a range the game wrote backwards", () => {
    expect(derollText("22(25-20)% reduced Effect of Chill on you")).toBe(
      "22% reduced Effect of Chill on you",
    );
  });

  it("leaves a number that has no range beside it alone", () => {
    expect(derollText("+2 to Level of Socketed Support Gems")).toBe(
      "+2 to Level of Socketed Support Gems",
    );
  });

  it("leaves a number that is part of the wording alone", () => {
    expect(derollText("7(6-8)% increased Attack Speed for 4 seconds")).toBe(
      "7% increased Attack Speed for 4 seconds",
    );
  });
});

describe("readRolls", () => {
  it("reads the value and its range", () => {
    expect(readRolls("+149(145-159) to maximum Life")).toEqual([{ value: 149, min: 145, max: 159 }]);
  });

  it("sorts a backwards range, so a downside reads like anything else", () => {
    expect(readRolls("22(25-20)% reduced Effect of Chill on you")).toEqual([
      { value: 22, min: 20, max: 25 },
    ]);
  });

  it("reads a negative range", () => {
    expect(readRolls("-20(-25--15)% to something")).toEqual([{ value: -20, min: -25, max: -15 }]);
  });

  it("reads decimals", () => {
    expect(readRolls("1.5(1-2)% of Life Regenerated")).toEqual([{ value: 1.5, min: 1, max: 2 }]);
  });

  it("reads both rolls of an added-damage line, in order", () => {
    expect(readRolls("1(1-3) to 28(28-30) Added Lightning Damage")).toEqual([
      { value: 1, min: 1, max: 3 },
      { value: 28, min: 28, max: 30 },
    ]);
  });

  it("reads nothing off a line whose numbers carry no range", () => {
    expect(readRolls("+2 to Level of Socketed Support Gems")).toEqual([]);
  });
});

describe("stripUnscalable", () => {
  it("takes the note off and says it was there", () => {
    expect(stripUnscalable("Can be Anointed up to 3 times — Unscalable Value")).toEqual({
      text: "Can be Anointed up to 3 times",
      unscalable: true,
    });
  });

  it("leaves a line that never had one", () => {
    expect(stripUnscalable("+40(30-50) to Dexterity")).toEqual({
      text: "+40(30-50) to Dexterity",
      unscalable: false,
    });
  });
});

describe("invertScaling", () => {
  it("writes reduced as increased with the sign flipped", () => {
    expect(invertScaling("28% reduced Charges per use")).toBe("-28% increased Charges per use");
  });

  it("writes less as more with the sign flipped", () => {
    expect(invertScaling("30% less Damage taken")).toBe("-30% more Damage taken");
  });

  it("flips a value that was already negative back to positive", () => {
    expect(invertScaling("-10% reduced Charges per use")).toBe("10% increased Charges per use");
  });

  it("says nothing when the line is already the direction GGG publishes", () => {
    expect(invertScaling("69% increased Chance to Block")).toBeUndefined();
  });
});
