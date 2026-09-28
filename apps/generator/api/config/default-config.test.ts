import { describe, it, expect } from "@jest/globals";
import { DEFAULT_CONFIG, STACK_FLOORS } from "./default-config.ts";

describe("DEFAULT_CONFIG", () => {
  it("gives Gold the stack-size floors instead of the global chaos ones", () => {
    const gold = DEFAULT_CONFIG.categories.Gold;

    expect(gold?.floors).toBe(STACK_FLOORS);
  }); // Gold is spread from PALETTES then overridden, so order matters

  it("leaves every category but Gold on the global floors", () => {
    const own = Object.entries(DEFAULT_CONFIG.categories).filter(([, one]) => one.floors !== undefined);

    expect(own.map(([key]) => key)).toEqual(["Gold"]);
  }); // a stray floors key would silently detach a category from the global slider

  it("starts every category with no tier disabled and nothing wanted", () => {
    const touched = Object.values(DEFAULT_CONFIG.categories).filter((one) => one.disabled.length > 0 || one.wanted.length > 0);

    expect(touched).toEqual([]);
  }); // a fresh player sees every tier
});
