import { describe, it, expect } from "@jest/globals";
import { originText } from "./origin-text.ts";

describe("originText", () => {
  it("writes the level followed by the name behind it", () => {
    const text = originText("category", { category: "StackableCurrency" });

    expect(text).toBe("category StackableCurrency"); // one space between level and name
  });

  it("writes the bare level when that level has no name", () => {
    const text = originText("variant", { category: "StackableCurrency" });

    expect(text).toBe("variant"); // other levels' names are not borrowed
  });

  it("keeps an empty name rather than dropping it", () => {
    const text = originText("item", { item: "" });

    expect(text).toBe("item "); // only undefined counts as missing
  });
});
