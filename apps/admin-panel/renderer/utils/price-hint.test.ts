import { describe, it, expect } from "@jest/globals";
import { priceHint } from "./price-hint.ts";

describe("priceHint", () => {
  it("says a quest item needs no listing, even when it has variants", () => {
    expect(priceHint({ quest: true, unpriceable: true }, true).placeholder).toBe("Not needed: a quest item");
  });

  it("says an unpriceable item needs no listing, even when it has variants", () => {
    expect(priceHint({ unpriceable: true }, true).placeholder).toBe("Not needed: unpriceable");
  });

  it("says a row with variants ignores its own listing", () => {
    expect(priceHint({}, true).placeholder).toBe("Not used: the variants are priced");
  });

  it("requires a listing otherwise", () => {
    expect(priceHint({ quest: false }, false).placeholder).toBe("Required: pick a PoeWatch listing");
  });
});
