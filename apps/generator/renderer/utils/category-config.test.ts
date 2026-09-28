import { describe, it, expect } from "@jest/globals";
import { DEFAULT_CONFIG, FALLBACK_PALETTE } from "../../api/generator-api.ts";
import { categoryConfig } from "./category-config.ts";

describe("categoryConfig", () => {
  it("gives a category the player never touched the fallback palette with nothing disabled or wanted", () => {
    const answer = categoryConfig(DEFAULT_CONFIG, "nope");

    expect(answer).toEqual({ palette: FALLBACK_PALETTE, disabled: [], wanted: [] });
  }); // a missing key falls through `??`, never throws

  it("gives a saved category exactly the settings the config holds", () => {
    const answer = categoryConfig(DEFAULT_CONFIG, "Gold");

    expect(answer).toBe(DEFAULT_CONFIG.categories.Gold);
  }); // same reference, not a merged copy
});
