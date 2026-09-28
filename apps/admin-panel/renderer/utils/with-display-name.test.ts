import { describe, it, expect } from "@jest/globals";
import { withDisplayName } from "./with-display-name.ts";
import { authored, ggg } from "../test-helpers.ts";

describe("withDisplayName", () => {
  it("edits a game item's display name and keeps its RePoE name", () => {
    const item = withDisplayName(ggg("Chaos Orb"), "Chaos");

    expect(item).toMatchObject({ name: "Chaos Orb", displayName: "Chaos" }); // name is the game's, never edited
  });

  it("edits an authored row's own name and writes no display name", () => {
    const item = withDisplayName(authored("old"), "new");

    expect({ name: item.name, hasDisplayName: "displayName" in item }).toEqual({ name: "new", hasDisplayName: false });
  });
});
