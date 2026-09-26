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
  it("writes font size and three colours, with no icon or beam lines for a plain style", () => {
    expect(actionLines(style)).toEqual([
      "SetFontSize 32",
      "SetTextColor 255 255 255 255",
      "SetBorderColor 0 0 0 255",
      "SetBackgroundColor 16 32 48 255",
    ]);
  });

  it("writes the opacity as a rounded alpha on every colour", () => {
    const lines = actionLines({ ...style, opacity: 0.4 });

    expect(lines[1]).toBe("SetTextColor 255 255 255 102");
  });

  it("adds a minimap icon and a beam when the style has them", () => {
    const lines = actionLines({ ...style, icon: { size: 0, colour: "Red", shape: "Star" }, beam: { colour: "Red" } });

    expect(lines.slice(4)).toEqual(["MinimapIcon 0 Red Star", "PlayEffect Red"]);
  });
});
