import { describe, it, expect } from "@jest/globals";
import { place } from "./place.ts";
import type { Item, PlaceOptions } from "./types.ts";

const CHAOS = { T0: 150, T1: 50, T2: 30, T3: 10, T4: 5, T5: 1 };
const STACKS = { T0: 5000, T1: 2500, T2: 1000, T3: 500, T4: 250, T5: 100 };

const options = (extra: Partial<PlaceOptions> = {}): PlaceOptions => ({
  floors: CHAOS,
  disabled: [],
  hints: [],
  wanted: [],
  ...extra,
});

const item = (name: string, prices: Item["prices"], category = "Currency"): Item => ({ name, key: name, category, prices });

const winner = (items: readonly Item[], opts: PlaceOptions, name: string) =>
  place(items, opts).placed.find((one) => one.item.name === name && one.won);

describe("place", () => {
  it("builds the ladder richest-first, with Hidden under the lowest floor", () => {
    const { ladder } = place([], options());

    expect(ladder[0]).toEqual({ name: "T0", floor: 150 });
    expect(ladder[1]).toEqual({ name: "T1", floor: 50, ceiling: 150 });
    expect(ladder[ladder.length - 1]).toEqual({ name: "Hidden", floor: 0, ceiling: 1 });
  });

  it("lets a disabled middle tier's range fall to the tier below", () => {
    const opts = options({ disabled: ["T2"] });

    expect(place([], opts).ladder.find((one) => one.name === "T3")).toEqual({ name: "T3", floor: 10, ceiling: 50 });
    expect(winner([item("Mid", { take: 40 })], opts, "Mid")?.bucket).toBe("T3");
  });

  it("hides what falls under the lowest enabled floor", () => {
    expect(winner([item("Scrap", { take: 0.5 })], options(), "Scrap")?.bucket).toBe("Hidden");
    expect(winner([item("Scrap", { take: 3 })], options({ disabled: ["T4", "T5"] }), "Scrap")?.bucket).toBe("Hidden");
  });

  it("places a 20/20 gem and a 21/20 corrupted gem as separate takes", () => {
    const items = [item("Absolution (20/20)", { take: 12 }, "skill-gems"), item("Absolution (21/20)", { take: 60 }, "skill-gems")];

    expect(winner(items, options(), "Absolution (20/20)")).toMatchObject({ bucket: "T3", verb: "take" });
    expect(winner(items, options(), "Absolution (21/20)")).toMatchObject({ bucket: "T1", verb: "take" });
  });

  it("qualifies Heavy Belt Uniques for take and check, and the richer check wins", () => {
    const belt = item("Heavy Belt Uniques (normal)", { take: 1, check: 80000 }, "unique");
    const { placed } = place([belt], options({ hints: ["check", "gamble"] }));

    expect(placed.map(({ bucket, verb, won }) => ({ bucket, verb, won }))).toEqual([
      { bucket: "T5", verb: "take", won: false },
      { bucket: "T0", verb: "check", won: true },
    ]);
  });

  it("lets the surest verb win inside one tier", () => {
    const one = item("Belt", { take: 60, check: 100 }, "unique");

    expect(winner([one], options({ hints: ["check"] }), "Belt")?.verb).toBe("take");
  });

  it("never reads a check price in a category without the check hint", () => {
    const { placed, unplaced } = place([item("Belt", { check: 80000 })], options());

    expect(placed).toEqual([]);
    expect(unplaced).toEqual([{ item: item("Belt", {}), reason: "nothing priced it" }]);
  });

  it("puts a want-to-see item there and nowhere else, whatever it is worth", () => {
    const { placed } = place([item("Screaming Essence of Fear", { take: 0.98 })], options({ wanted: ["Screaming Essence of Fear"] }));

    expect(placed).toHaveLength(1);
    expect(placed[0]).toMatchObject({ bucket: "Want to see", verb: "take", won: true });
  });

  it("reports an item nothing priced as unplaced", () => {
    expect(place([item("Gold", {})], options()).unplaced[0]?.reason).toBe("nothing priced it");
  });

  it("gives Gold one block per tier and Hidden, each with its stack range", () => {
    const { placed, unplaced } = place([item("Gold", {}, "Gold")], options({ floors: STACKS, tiering: "stack-size" }));

    expect(unplaced).toEqual([]);
    expect(placed.map(({ bucket, stack, won }) => ({ bucket, stack, won }))).toEqual([
      { bucket: "T0", stack: { floor: 5000 }, won: true },
      { bucket: "T1", stack: { floor: 2500, ceiling: 5000 }, won: true },
      { bucket: "T2", stack: { floor: 1000, ceiling: 2500 }, won: true },
      { bucket: "T3", stack: { floor: 500, ceiling: 1000 }, won: true },
      { bucket: "T4", stack: { floor: 250, ceiling: 500 }, won: true },
      { bucket: "T5", stack: { floor: 100, ceiling: 250 }, won: true },
      { bucket: "Hidden", stack: { floor: 0, ceiling: 100 }, won: true },
    ]);
  });

  it("lets a disabled Gold tier's stacks fall to the tier below", () => {
    const { placed } = place([item("Gold", {}, "Gold")], options({ floors: STACKS, tiering: "stack-size", disabled: ["T1"] }));

    expect(placed.map((one) => one.bucket)).not.toContain("T1");
    expect(placed.find((one) => one.bucket === "T2")?.stack).toEqual({ floor: 1000, ceiling: 5000 });
  });
});
