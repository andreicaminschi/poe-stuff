import { describe, it, expect } from "@jest/globals";
import { actionLines } from "./actions.ts";
import type { Style } from "../types.ts";

const style: Style = {
  size: "M",
  fontSize: 32,
  background: "#102030",
  text: "#ffffff",
  border: "#000000",
  opacity: 1,
  icon: null,
  beam: null,
};

describe("actionLines", () => {
  it("writes the font size and three colours, and no icon or beam, for a plain style", () => {
    const lines = actionLines(style);

    expect(lines).toEqual([
      "SetFontSize 32",
      "SetTextColor 255 255 255 255",
      "SetBorderColor 0 0 0 255",
      "SetBackgroundColor 16 32 48 255",
    ]); // full opacity is alpha 255
  });

  it("writes forty percent opacity as an alpha of 102 on every colour", () => {
    const lines = actionLines({ ...style, opacity: 0.4 });

    expect(lines.slice(1, 4).map((line) => line.split(" ").at(-1))).toEqual(["102", "102", "102"]); // 255 * 0.4 = 102
  });

  it("adds a minimap icon line and a beam line after the colours when the style has them", () => {
    const lines = actionLines({ ...style, icon: { size: 0, colour: "Red", shape: "Star" }, beam: { colour: "Red" } });

    expect(lines.slice(4)).toEqual(["MinimapIcon 0 Red Star", "PlayEffect Red"]);
  });
});
