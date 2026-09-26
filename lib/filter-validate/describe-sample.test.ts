import { describe, it, expect } from "@jest/globals";
import { describeSample } from "./describe-sample.ts";

describe("describeSample", () => {
  it("writes each property as its name and value, joined by a middle dot", () => {
    expect(describeSample({ Quality: 20, Corrupted: true })).toBe("Quality 20 · Corrupted true");
  });

  it("joins a list value with spaces", () => {
    expect(describeSample({ HasInfluence: ["Shaper", "Elder"] })).toBe("HasInfluence Shaper Elder");
  });

  it("writes an empty list as None", () => {
    expect(describeSample({ HasInfluence: [] })).toBe("HasInfluence None");
  });

  it("writes nothing for an item with no properties", () => {
    expect(describeSample({})).toBe("");
  });
});
