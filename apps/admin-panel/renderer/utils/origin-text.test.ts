import { describe, it, expect } from "@jest/globals";
import { originText } from "./origin-text.ts";

describe("originText", () => {
  it("writes the level and the name behind it", () => {
    expect(originText("category", { category: "StackableCurrency" })).toBe("category StackableCurrency");
  });

  it("writes the bare level when no name is known", () => {
    expect(originText("variant", { category: "x" })).toBe("variant");
  });
});
