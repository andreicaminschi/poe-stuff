import { describe, it, expect } from "@jest/globals";
import { kindOf } from "./kind-of.ts";

describe("kindOf", () => {
  it("reads a condition filled from the name as from-name", () => {
    expect(kindOf({ condition: "BaseType", from: "name", value: 1 })).toBe("from-name");
  });

  it("reads any other filled-in condition as from-baseTypes", () => {
    expect(kindOf({ condition: "BaseType", from: "anything" })).toBe("from-baseTypes");
  });

  it("reads a null value as a removal", () => {
    expect(kindOf({ condition: "Corrupted", value: null })).toBe("remove");
  });

  it("reads a list", () => {
    expect(kindOf({ condition: "Class", value: [] })).toBe("list");
  });

  it("reads a number", () => {
    expect(kindOf({ condition: "ItemLevel", value: 0 })).toBe("number");
  });

  it("reads a boolean as a flag", () => {
    expect(kindOf({ condition: "Corrupted", value: false })).toBe("flag");
  });

  it("reads a condition with no value as text", () => {
    expect(kindOf({ condition: "Corrupted" })).toBe("text");
  });
});
