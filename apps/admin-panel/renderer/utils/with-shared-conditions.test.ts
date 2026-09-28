import { describe, it, expect } from "@jest/globals";
import { withSharedConditions } from "./with-shared-conditions.ts";
import { ggg } from "../test-helpers.ts";

describe("withSharedConditions", () => {
  const rare = { condition: "Rarity", value: "Rare" };
  const magic = { condition: "Rarity", value: "Magic" };
  const own = { condition: "Quality", value: 20 };

  it("swaps the old shared conditions for the new ones and keeps its own extras first", () => {
    const item = ggg("a", { conditions: [rare, own] });

    const next = withSharedConditions(item, [rare], [magic]);

    expect(next.conditions).toEqual([own, magic]); // new shared ones are appended
  });

  it("drops every copy of a removed shared condition", () => {
    const item = ggg("a", { conditions: [rare, rare, own] });

    const next = withSharedConditions(item, [rare], []);

    expect(next.conditions).toEqual([own]);
  });

  it("keeps an unchanged shared condition in place", () => {
    const item = ggg("a", { conditions: [rare, own] });

    const next = withSharedConditions(item, [rare], [rare]);

    expect(next.conditions).toEqual([rare, own]); // not moved to the end
  });

  it("does not add a new shared condition the item already had as its own", () => {
    const item = ggg("a", { conditions: [own] });

    const next = withSharedConditions(item, [], [own]);

    expect(next.conditions).toEqual([own]); // no duplicate
  });

  it("matches a shared condition written differently but meaning the same", () => {
    const item = ggg("a", { conditions: [{ condition: "Rarity", operator: "==", value: "Rare" }, own] });

    const next = withSharedConditions(item, [rare], []);

    expect(next.conditions).toEqual([own]); // compared by meaning, not by object shape
  });
});
