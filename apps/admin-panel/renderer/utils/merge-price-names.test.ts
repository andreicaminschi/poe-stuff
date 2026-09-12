import { describe, it, expect } from "@jest/globals";
import { mergePriceNames } from "./merge-price-names.ts";

describe("mergePriceNames", () => {
  it("gives one sorted option per name", () => {
    expect(
      mergePriceNames([{ name: "Headhunter", label: "unique · 3 forms" }], [{ name: "Chaos Orb", label: "exchange" }]),
    ).toEqual([
      { value: "Chaos Orb", label: "exchange" },
      { value: "Headhunter", label: "unique · 3 forms" },
    ]);
  });

  it("keeps both labels for a name in both lists", () => {
    expect(mergePriceNames([{ name: "Divine Orb", label: "currency" }], [{ name: "Divine Orb", label: "exchange" }])).toEqual([
      { value: "Divine Orb", label: "currency · exchange" },
    ]);
  });

  it("gives nothing for two empty lists", () => {
    expect(mergePriceNames([], [])).toEqual([]);
  });
});
