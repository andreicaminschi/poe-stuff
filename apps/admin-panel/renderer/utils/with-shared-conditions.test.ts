import { describe, it, expect } from "@jest/globals";
import { withSharedConditions } from "./with-shared-conditions.ts";
import { ggg } from "../test-helpers.ts";

describe("withSharedConditions", () => {
  const rare = { condition: "Rarity", value: "Rare" };
  const magic = { condition: "Rarity", value: "Magic" };
  const own = { condition: "Quality", value: 20 };

  it("swaps the old shared conditions for the new ones and keeps its own extras first", () => {
    const item = ggg("a", { conditions: [rare, own] });

    expect(withSharedConditions(item, [rare], [magic]).conditions).toEqual([own, magic]);
  });

  it("drops every copy of a removed shared condition", () => {
    const item = ggg("a", { conditions: [rare, rare, own] });

    expect(withSharedConditions(item, [rare], []).conditions).toEqual([own]);
  });

  it("keeps an unchanged shared condition in place", () => {
    const item = ggg("a", { conditions: [rare, own] });

    expect(withSharedConditions(item, [rare], [rare]).conditions).toEqual([rare, own]);
  });
});
