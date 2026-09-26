import { describe, it, expect } from "@jest/globals";
import { sharedValue } from "./shared-value.ts";

describe("sharedValue", () => {
  it("has no shared value for an empty list", () => {
    expect(sharedValue([])).toBeUndefined();
  });

  it("returns the value every entry agrees on", () => {
    expect(sharedValue(["a", "a"])).toBe("a");
  });

  it("has no shared value when one entry differs", () => {
    expect(sharedValue(["a", "a", "b"])).toBeUndefined();
  });

  it("treats a shared empty string as a shared value", () => {
    expect(sharedValue(["", ""])).toBe("");
  });
});
