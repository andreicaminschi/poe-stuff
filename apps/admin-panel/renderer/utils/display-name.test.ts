import { describe, it, expect } from "@jest/globals";
import { displayName } from "./display-name.ts";
import { authored, ggg } from "../test-helpers.ts";

describe("displayName", () => {
  it("shows an authored row's name", () => { // authored rows have no separate display name
    expect(displayName(authored("Mine"))).toBe("Mine");
  });

  it("shows a game item's display name when it has one", () => { // the display name beats RePoE's
    expect(displayName(ggg("Chaos Orb", { displayName: "Chaos" }))).toBe("Chaos");
  });

  it("falls back to the RePoE name when the display name is only spaces", () => { // blank is trimmed before the check
    expect(displayName(ggg("Chaos Orb", { displayName: "  " }))).toBe("Chaos Orb");
  });

  it("falls back to the RePoE name when there is no display name", () => { // undefined takes the same path as blank
    expect(displayName(ggg("Chaos Orb"))).toBe("Chaos Orb");
  });
});
