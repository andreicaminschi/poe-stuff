import { describe, it, expect } from "@jest/globals";
import { withDisplayName } from "./with-display-name.ts";
import { authored, ggg } from "../test-helpers.ts";

describe("withDisplayName", () => {
  it("edits a game item's display name and keeps its RePoE name", () => {
    const item = withDisplayName(ggg("Chaos Orb"), "Chaos");

    expect(item).toMatchObject({ name: "Chaos Orb", displayName: "Chaos" });
  });

  it("edits an authored row's own name", () => {
    expect(withDisplayName(authored("old"), "new").name).toBe("new");
  });
});
