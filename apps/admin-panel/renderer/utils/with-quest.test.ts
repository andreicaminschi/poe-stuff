import { describe, it, expect } from "@jest/globals";
import { withQuest } from "./with-quest.ts";
import { ggg } from "../test-helpers.ts";

describe("withQuest", () => {
  it("marks the item a quest item", () => {
    const item = withQuest(ggg("a"), true);

    expect(item.quest).toBe(true);
  });

  it("removes the flag when unset instead of writing false", () => {
    const item = withQuest(ggg("a", { quest: true }), false);

    expect("quest" in item).toBe(false); // keeps the saved file free of false flags
  });
});
