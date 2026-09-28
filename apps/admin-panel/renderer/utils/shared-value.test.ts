import { describe, it, expect } from "@jest/globals";
import { sharedValue } from "./shared-value.ts";

describe("sharedValue", () => {
  it("has no shared value for an empty list", () => {
    const value = sharedValue([]);

    expect(value).toBeUndefined();
  });

  it("returns the only value of a one-entry list", () => {
    const value = sharedValue(["a"]);

    expect(value).toBe("a");
  });

  it("returns the value every entry agrees on", () => {
    const value = sharedValue(["a", "a"]);

    expect(value).toBe("a");
  });

  it("has no shared value when the last entry differs", () => {
    const value = sharedValue(["a", "a", "b"]);

    expect(value).toBeUndefined(); // every entry is checked, not just the first two
  });

  it("treats a shared empty string as a shared value", () => {
    const value = sharedValue(["", ""]);

    expect(value).toBe(""); // falsy but defined
  });
});
