import { describe, it, expect } from "@jest/globals";
import { DEFAULT_CONFIG, FALLBACK_PALETTE } from "../../api/generator-api.ts";
import { categoryConfig } from "./category-config.ts";

describe("categoryConfig", () => {
  it("answers with the fallback palette and nothing disabled for an unknown category", () => {
    expect(categoryConfig(DEFAULT_CONFIG, "nope")).toEqual({ palette: FALLBACK_PALETTE, disabled: [], wanted: [] });
  });

  it("answers with the saved settings for a known category", () => {
    expect(categoryConfig(DEFAULT_CONFIG, "Gold")).toBe(DEFAULT_CONFIG.categories.Gold);
  });
});
