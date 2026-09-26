import { describe, it, expect } from "@jest/globals";
import { DEFAULT_CONFIG, STACK_FLOORS } from "./default-config.ts";

describe("DEFAULT_CONFIG", () => {
  it("gives Gold the stack-size floors instead of the global chaos ones", () => {
    expect(DEFAULT_CONFIG.categories.Gold?.floors).toBe(STACK_FLOORS);
  });

  it("leaves every other category on the global floors", () => {
    const own = Object.entries(DEFAULT_CONFIG.categories).filter(([, one]) => one.floors !== undefined);

    expect(own.map(([key]) => key)).toEqual(["Gold"]);
  });

  it("starts every category with no tier disabled and nothing wanted", () => {
    const touched = Object.values(DEFAULT_CONFIG.categories).filter((one) => one.disabled.length > 0 || one.wanted.length > 0);

    expect(touched).toEqual([]);
  });
});
