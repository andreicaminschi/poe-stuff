import { describe, it, expect } from "@jest/globals";
import { withQuest } from "./with-quest.ts";
import { ggg } from "../test-helpers.ts";

describe("withQuest", () => {
  it("marks the item a quest item", () => {
    expect(withQuest(ggg("a"), true).quest).toBe(true);
  });

  it("removes the key when unset instead of writing false", () => {
    expect("quest" in withQuest(ggg("a", { quest: true }), false)).toBe(false);
  });
});
