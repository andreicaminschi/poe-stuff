import { describe, it, expect } from "@jest/globals";
import { STACK_FLOORS, type GeneratorConfig } from "../../api/generator-api.ts";
import { placeOptions } from "./place-options.ts";
import { withCategory } from "./with-category.ts";

const floors = { T0: 9, T1: 8, T2: 7, T3: 6, T4: 5, T5: 4 };
const config: GeneratorConfig = { floors, categories: {} };

describe("placeOptions", () => {
  it("uses the global floors for a chaos category with no floors of its own", () => {
    expect(placeOptions(config, "maps", { conditions: [] })).toEqual({ floors, disabled: [], hints: [], wanted: [] });
  });

  it("uses the stack floors and stack tiering for a stack-size category with no floors of its own", () => {
    const options = placeOptions(config, "Gold", { conditions: [], tiering: "stack-size" });

    expect(options).toEqual({ floors: STACK_FLOORS, disabled: [], hints: [], wanted: [], tiering: "stack-size" });
  });

  it("prefers the category's own floors over both", () => {
    const own = { ...floors, T0: 1234 };
    const withOwn = withCategory(config, "Gold", (one) => ({ ...one, floors: own }));

    expect(placeOptions(withOwn, "Gold", { conditions: [], tiering: "stack-size" }).floors).toBe(own);
  });

  it("takes the hints from the category record", () => {
    expect(placeOptions(config, "x", { conditions: [], hints: ["check"] }).hints).toEqual(["check"]);
  });

  it("treats a missing category record as a chaos category with no hints", () => {
    expect(placeOptions(config, "x", undefined)).toEqual({ floors, disabled: [], hints: [], wanted: [] });
  });
});
