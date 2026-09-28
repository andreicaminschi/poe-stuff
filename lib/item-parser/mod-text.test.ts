import { describe, it, expect } from "@jest/globals";
import { derollText, invertScaling, readRolls, stripUnscalable } from "./mod-text.ts";

describe("derollText", () => {
  it("removes both bracketed ranges and keeps the values that were rolled", () => {
    expect(derollText("Adds 3(2-4) to 7(6-8) Cold Damage")).toBe("Adds 3 to 7 Cold Damage"); // global replace
  });

  it("removes a range between two negatives and a range around a decimal", () => {
    expect(derollText("-10(-25--15)% and 1.5(1-2)")).toBe("-10% and 1.5"); // "--" is minus then a negative
  });

  it("leaves a number with no range beside it alone", () => {
    expect(derollText("+2 to Level of Socketed Support Gems")).toBe("+2 to Level of Socketed Support Gems");
  });
});

describe("readRolls", () => {
  it("reads every roll on the line in the order printed", () => {
    expect(readRolls("+149(145-159) to maximum Life, 1.5(1-2)")).toEqual([
      { value: 149, min: 145, max: 159 },
      { value: 1.5, min: 1, max: 2 },
    ]);
  });

  it("reads a range the game printed backwards with the smaller end as the minimum", () => {
    expect(readRolls("22(25-20)% reduced")).toEqual([{ value: 22, min: 20, max: 25 }]); // downsides print high-low
  });

  it("reads a range between two negatives", () => {
    expect(readRolls("-10(-25--15)")).toEqual([{ value: -10, min: -25, max: -15 }]);
  });

  it("reads no rolls from a line with no brackets, even when it has a number", () => {
    expect(readRolls("for 4 seconds")).toEqual([]); // a bare number may be wording
  });
});

describe("stripUnscalable", () => {
  it("removes the unscalable note at the end of a line and says it was there", () => {
    const result = stripUnscalable("Can be Anointed up to 3 times — Unscalable Value");

    expect(result).toEqual({ text: "Can be Anointed up to 3 times", unscalable: true });
  });

  it("leaves the note alone when it is in the middle of a line", () => {
    const result = stripUnscalable("x — Unscalable Value y");

    expect(result).toEqual({ text: "x — Unscalable Value y", unscalable: false }); // anchored to the end
  });
});

describe("invertScaling", () => {
  it("rewrites 28% reduced as -28% increased", () => {
    expect(invertScaling("28% reduced Charges per use")).toBe("-28% increased Charges per use"); // GGG only publishes increased
  });

  it("rewrites 10% less as -10% more", () => {
    expect(invertScaling("10% less Damage")).toBe("-10% more Damage");
  });

  it("turns an already negative reduced into a positive increased", () => {
    expect(invertScaling("-5% reduced Cost")).toBe("5% increased Cost");
  });

  it("rewrites a flat value without a percent sign too", () => {
    expect(invertScaling("5 reduced Mana")).toBe("-5 increased Mana");
  });

  it("gives nothing back when there is no reduced or less to flip", () => {
    expect(invertScaling("28% increased Charges per use")).toBeUndefined(); // tells the caller not to retry
  });
});
