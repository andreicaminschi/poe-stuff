import { describe, it, expect } from "@jest/globals";
import { FALLBACK_PALETTE, type GeneratorConfig } from "../../api/generator-api.ts";
import { withCategory } from "./with-category.ts";

const config: GeneratorConfig = { floors: { T0: 9, T1: 8, T2: 7, T3: 6, T4: 5, T5: 4 }, categories: {} };

describe("withCategory", () => {
  it("starts a category the config has never seen from the fallback before applying the change", () => {
    const next = withCategory(config, "new", (one) => ({ ...one, wanted: ["x"] }));

    expect(next.categories.new).toEqual({ palette: FALLBACK_PALETTE, disabled: [], wanted: ["x"] });
  }); // change receives categoryConfig's fallback, not undefined

  it("keeps every other category and the floors as they were", () => {
    const start: GeneratorConfig = { ...config, categories: { old: { palette: FALLBACK_PALETTE, disabled: ["T1"], wanted: [] } } };

    const next = withCategory(start, "new", (one) => one);

    expect(next.categories.old).toBe(start.categories.old);
    expect(next.floors).toBe(start.floors);
  }); // shallow spread keeps siblings by reference

  it("leaves the config it was given untouched", () => {
    withCategory(config, "new", (one) => one);

    expect(config.categories).toEqual({});
  }); // returns a new categories map
});
