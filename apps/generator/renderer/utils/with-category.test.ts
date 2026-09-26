import { describe, it, expect } from "@jest/globals";
import { FALLBACK_PALETTE, type GeneratorConfig } from "../../api/generator-api.ts";
import { withCategory } from "./with-category.ts";

const config: GeneratorConfig = { floors: { T0: 9, T1: 8, T2: 7, T3: 6, T4: 5, T5: 4 }, categories: {} };

describe("withCategory", () => {
  it("starts an unknown category from the fallback before applying the change", () => {
    const next = withCategory(config, "new", (one) => ({ ...one, wanted: ["x"] }));

    expect(next.categories.new).toEqual({ palette: FALLBACK_PALETTE, disabled: [], wanted: ["x"] });
  });

  it("leaves the original config untouched", () => {
    withCategory(config, "new", (one) => one);

    expect(config.categories).toEqual({});
  });
});
