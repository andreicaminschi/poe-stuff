import { describe, it, expect } from "@jest/globals";
import { contrast, nearestNamed } from "./tier-style/colour.ts";
import { tierStyle } from "./tier-style.ts";
import type { Palette } from "./types.ts";

const currency: Palette = { primary: "#f05a23", secondary: "#ffffff", icon: "Star" };
const gems: Palette = { primary: "#14f0f0", secondary: "#460014", icon: "Triangle" };

describe("tierStyle", () => {
  it("draws T0 on white in primary, with a size 0 icon and a beam of the same colour", () => {
    expect(tierStyle(currency, "T0")).toEqual({
      size: "XL",
      fontSize: 45,
      background: "#ffffff",
      text: "#f05a23",
      border: "#f05a23",
      opacity: 1,
      icon: { size: 0, colour: "Orange", shape: "Star" },
      beam: { colour: "Orange" },
    });
  });

  it("keeps T0 white even when a light primary reads badly on it", () => {
    const style = tierStyle(gems, "T0");

    expect(style.background).toBe("#ffffff");
    expect(style.text).toBe("#14f0f0");
    expect(contrast(style.background, style.text)).toBeLessThan(1.6);
    expect(style.icon?.colour).toBe("Cyan");
  });

  it("draws T1 in primary with secondary text and a size 1 icon", () => {
    expect(tierStyle(currency, "T1")).toMatchObject({ size: "XL", background: "#f05a23", text: "#ffffff", icon: { size: 1 } });
  });

  it("mixes T2 at 20% secondary, with no icon or beam", () => {
    expect(tierStyle(currency, "T2")).toMatchObject({ size: "L", background: "#f37b4f", text: "#ffffff", icon: null, beam: null });
  });

  it("writes T3-T5 text in black or primary, whichever reads better, and the border matches", () => {
    const t3 = tierStyle(gems, "T3");
    const t5 = tierStyle(gems, "T5");

    expect(t3).toMatchObject({ size: "M", text: "#000000", border: "#000000" });
    expect(t5).toMatchObject({ size: "XS", text: "#14f0f0", border: "#14f0f0" });
    expect(tierStyle(gems, "T4").size).toBe("S");
  });

  it("draws Hidden as T5 at 40%", () => {
    expect(tierStyle(currency, "Hidden")).toEqual({ ...tierStyle(currency, "T5"), opacity: 0.4 });
  });

  it("draws Want to see in primary with a beam and no icon", () => {
    expect(tierStyle(currency, "Want to see")).toMatchObject({
      size: "S",
      background: "#f05a23",
      text: "#ffffff",
      icon: null,
      beam: { colour: "Orange" },
    });
  });

  it("overrides the border with the hint's colour", () => {
    expect(tierStyle(currency, "T0", "check").border).toBe("#3c8cff");
    expect(tierStyle(currency, "T3", "gamble").border).toBe("#ff2d2d");
    expect(tierStyle(currency, "T3", "take").border).toBe(tierStyle(currency, "T3").border);
  });
});

describe("nearestNamed", () => {
  it("picks the closest of the game's eleven colours", () => {
    expect(nearestNamed("#af6025")).toBe("Brown");
    expect(nearestNamed("#0000ff")).toBe("Blue");
  });
});
