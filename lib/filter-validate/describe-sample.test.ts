import { describe, it, expect } from "@jest/globals";
import { describeSample } from "./describe-sample.ts";

describe("describeSample", () => {
  it("writes each property as its name and value, joined by a middle dot, in the item's order", () => {
    const text = describeSample({ Quality: 20, Corrupted: true });

    expect(text).toBe("Quality 20 · Corrupted true");
  });

  it("joins two influences with a space", () => {
    const text = describeSample({ HasInfluence: ["Shaper", "Elder"] });

    expect(text).toBe("HasInfluence Shaper Elder");
  });

  it("writes an empty influence list as None", () => {
    const text = describeSample({ HasInfluence: [] });

    expect(text).toBe("HasInfluence None"); // matches how the filter spells it
  });

  it("writes nothing for an item with no properties", () => {
    const text = describeSample({});

    expect(text).toBe("");
  });
});
