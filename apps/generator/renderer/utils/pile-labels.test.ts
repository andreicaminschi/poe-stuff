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
  it("centres a lone label over the middle of the ground when the item falls dead centre", () => {
    const [one] = pileLabels([loot("a")], 800, 600, fixed(100));

    expect(one).toMatchObject({ x: 400 - 54, y: 300 - 7, w: 108, h: 14, px: 10, gx: 400, gy: 300 });
  });

  it("widens a label that carries a minimap icon", () => {
    const withIcon = { ...plain, icon: { size: 0 as const, colour: "Red" as const, shape: "Star" as const } };

    expect(pileLabels([loot("a", withIcon)], 800, 600, fixed(100))[0]?.w).toBe(117);
  });

  it("slides a second label that lands on the first to sit flush beside it", () => {
    const [first, second] = pileLabels([loot("a"), loot("b")], 800, 600, fixed(100));

    expect(second?.x).toBe((first?.x ?? 0) + (first?.w ?? 0));
    expect(second?.y).toBe(first?.y);
  });

  it("stacks a label too wide to slide sideways one line above the first", () => {
    const [first, second] = pileLabels([loot("a"), loot("b")], 800, 600, fixed(1000));

    expect(second?.x).toBe(first?.x);
    expect(second?.y).toBe((first?.y ?? 0) - 14);
  });

  it("scatters where the item falls with the random roll", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    expect(pileLabels([loot("a")], 800, 600, fixed(100))[0]).toMatchObject({ gx: 280, gy: 240 });
  });

  it("answers with nothing for no drops", () => {
    expect(pileLabels([], 800, 600, fixed(100))).toEqual([]);
  });
});
