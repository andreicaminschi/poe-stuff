import { describe, it, expect } from "@jest/globals";
import { contrast, mix, nearestNamed, readable, rgbOf } from "./colour.ts";

describe("rgbOf", () => {
  it("reads a six-digit hex colour as its red, green and blue channels", () => {
    expect(rgbOf("#ff8000")).toEqual([255, 128, 0]);
  });
});

describe("mix", () => {
  it("returns the primary colour untouched when none of the secondary is mixed in", () => {
    expect(mix("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });

  it("returns the secondary colour when all of it is mixed in", () => {
    expect(mix("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("rounds a half channel up when mixing half and half", () => {
    expect(mix("#ff0000", "#0000ff", 0.5)).toBe("#800080"); // 127.5 rounds to 128
  });

  it("pads a small channel to two hex digits", () => {
    expect(mix("#0a0000", "#000000", 0)).toBe("#0a0000");
  });
});

describe("contrast", () => {
  it("gives the full ratio of twenty-one between black and white", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("gives the same ratio whichever colour comes first", () => {
    expect(contrast("#ffffff", "#123456")).toBe(contrast("#123456", "#ffffff"));
  });

  it("gives a ratio of one for a colour against itself", () => {
    expect(contrast("#4560ff", "#4560ff")).toBe(1);
  });
});

describe("readable", () => {
  it("picks black text on a light background", () => {
    expect(readable("#ffffff", "#ff0000")).toBe("#000000");
  });

  it("picks the primary colour on a black background", () => {
    expect(readable("#000000", "#ffffff")).toBe("#ffffff");
  });

  it("picks black when black and the primary read equally well", () => {
    expect(readable("#808080", "#000000")).toBe("#000000"); // tie goes to black
  });
});

describe("nearestNamed", () => {
  it("names an exact game colour as itself", () => {
    expect(nearestNamed("#4560ff")).toBe("Blue");
  });

  it("names pure red as the game's red", () => {
    expect(nearestNamed("#ff0000")).toBe("Red");
  });

  it("names black as the game's brown, since no black exists", () => {
    expect(nearestNamed("#000000")).toBe("Brown"); // nearer than Grey
  });
});
