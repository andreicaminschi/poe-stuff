import { describe, it, expect } from "@jest/globals";
import { displayName } from "./display-name.ts";
import { authored, ggg } from "../test-helpers.ts";

describe("displayName", () => {
  it("shows an authored row's name", () => {
    expect(displayName(authored("Mine"))).toBe("Mine");
  });

  it("shows a game item's display name when it has one", () => {
    expect(displayName(ggg("Chaos Orb", { displayName: "Chaos" }))).toBe("Chaos");
  });

  it("falls back to the RePoE name when the display name is blank", () => {
    expect(displayName(ggg("Chaos Orb", { displayName: "  " }))).toBe("Chaos Orb");
  });

  it("falls back to the RePoE name when there is no display name", () => {
    expect(displayName(ggg("Chaos Orb"))).toBe("Chaos Orb");
  });
});
