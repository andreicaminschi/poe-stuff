import { describe, it, expect } from "@jest/globals";
import { STACK_FLOORS, type GeneratorConfig } from "../../api/generator-api.ts";
import { placeOptions } from "./place-options.ts";
import { withCategory } from "./with-category.ts";

const floors = { T0: 9, T1: 8, T2: 7, T3: 6, T4: 5, T5: 4 };
const config: GeneratorConfig = { floors, categories: {} };

describe("placeOptions", () => {
  it("uses the global floors for a chaos category with no floors of its own", () => {
    const options = placeOptions(config, "maps", { conditions: [] });

    expect(options).toEqual({ floors, disabled: [], hints: [], wanted: [] });
  }); // no tiering key at all, not tiering: undefined

  it("uses the stack floors and stack tiering for a stack-size category with no floors of its own", () => {
    const options = placeOptions(config, "Gold", { conditions: [], tiering: "stack-size" });

    expect(options).toEqual({ floors: STACK_FLOORS, disabled: [], hints: [], wanted: [], tiering: "stack-size" });
  }); // chaos floors would be meaningless as stack sizes

  it("prefers a category's own floors over both the global and the stack floors", () => {
    const own = { ...floors, T0: 1234 };
    const withOwn = withCategory(config, "Gold", (one) => ({ ...one, floors: own }));

    const options = placeOptions(withOwn, "Gold", { conditions: [], tiering: "stack-size" });

    expect(options.floors).toBe(own);
  }); // own floors checked before tiering

  it("takes the hints from the category record", () => {
    const options = placeOptions(config, "x", { conditions: [], hints: ["check"] });

    expect(options.hints).toEqual(["check"]);
  }); // hints live on the taxonomy record, not the config

  it("treats a category with no record as a chaos category with no hints", () => {
    const options = placeOptions(config, "x", undefined);

    expect(options).toEqual({ floors, disabled: [], hints: [], wanted: [] });
  }); // optional chaining on a missing record
});
