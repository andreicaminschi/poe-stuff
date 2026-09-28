import { describe, it, expect } from "@jest/globals";
import { priceHint } from "./price-hint.ts";

describe("priceHint", () => {
  it("says a quest item needs no listing, even when it is also unpriceable and has variants", () => {
    const hint = priceHint({ quest: true, unpriceable: true }, true);

    expect(hint.placeholder).toBe("Not needed: a quest item"); // quest is checked first
  });

  it("says an unpriceable item needs no listing, even when it has variants", () => {
    const hint = priceHint({ unpriceable: true }, true);

    expect(hint.placeholder).toBe("Not needed: unpriceable"); // beats the variants case
  });

  it("says a row with variants ignores its own listing", () => {
    const hint = priceHint({}, true);

    expect(hint.placeholder).toBe("Not used: the variants are priced");
  });

  it("requires a listing when the flags are false rather than missing", () => {
    const hint = priceHint({ quest: false, unpriceable: false }, false);

    expect(hint).toEqual({
      placeholder: "Required: pick a PoeWatch listing",
      note: "Required. The exact listing this row prices off; without one the row is not published.",
    }); // only === true exempts a row
  });
});
