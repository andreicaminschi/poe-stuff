import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { Style } from "@poe/filter-style/types";
import type { Loot } from "./loot-pool.ts";
import { pileLabels } from "./pile-labels.ts";

const base = tierStyle({ primary: "#ff0000", secondary: "#ffffff", icon: "Star" }, "T1");
const plain: Style = { ...base, fontSize: 10, icon: null };
const loot = (name: string, style = plain): Loot => ({ name, bucket: "T1", style, worth: 1 });
const fixed = (width: number) => () => width;

beforeEach(() => {
  jest.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("pileLabels", () => {
  it("centres a lone 100px-wide label over the middle of an 800 by 600 ground when the item falls dead centre", () => {
    const [one] = pileLabels([loot("a")], 800, 600, fixed(100));

    expect(one).toMatchObject({ x: 400 - 54, y: 300 - 7, w: 108, h: 14, px: 10, gx: 400, gy: 300 });
  }); // width adds padding both sides and 2px border

  it("widens a label that carries a minimap icon by the icon's width", () => {
    const withIcon = { ...plain, icon: { size: 0 as const, colour: "Red" as const, shape: "Star" as const } };

    const [one] = pileLabels([loot("a", withIcon)], 800, 600, fixed(100));

    expect(one?.w).toBe(117);
  }); // icon adds 0.92 of the font size

  it("slides a second label that lands on the first to sit flush on its right", () => {
    const [first, second] = pileLabels([loot("a"), loot("b")], 800, 600, fixed(100));

    expect({ x: second?.x, y: second?.y }).toEqual({ x: (first?.x ?? 0) + (first?.w ?? 0), y: first?.y });
  }); // touching edges do not count as a hit

  it("stacks a label too wide to slide sideways one line above the first", () => {
    const [first, second] = pileLabels([loot("a"), loot("b")], 800, 600, fixed(1000));

    expect({ x: second?.x, y: second?.y }).toEqual({ x: first?.x, y: (first?.y ?? 0) - 14 });
  }); // sideways spots beyond 260px reach are refused

  it("drops the item 120px left and 60px up of centre when the roll is zero", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const [one] = pileLabels([loot("a")], 800, 600, fixed(100));

    expect(one).toMatchObject({ gx: 280, gy: 240 });
  }); // scatter spans 240 wide and 120 tall

  it("piles nothing when nothing dropped", () => {
    const piled = pileLabels([], 800, 600, fixed(100));

    expect(piled).toEqual([]);
  }); // degenerate input
});
