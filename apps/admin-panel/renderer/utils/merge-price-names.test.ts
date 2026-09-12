import { describe, it, expect } from "@jest/globals";
import { mergePriceNames } from "./merge-price-names.ts";

describe("mergePriceNames", () => {
  it("gives one sorted option per listing", () => {
    const high = { name: "Ghastly Eye Jewel", frame: 0, itemLevel: 86, synthesised: false };
    const low = { name: "Ghastly Eye Jewel", frame: 0, itemLevel: 83, synthesised: false };

    expect(
      mergePriceNames(
        [
          { name: high.name, label: "bases · 2836c · 6/d", listing: high },
          { name: low.name, label: "bases · 1c · 526/d", listing: low },
        ],
        [{ name: "Chaos Orb", label: "exchange", listing: { name: "Chaos Orb" } }],
      ),
    ).toEqual([
      { value: "Chaos Orb", label: "exchange", listing: { name: "Chaos Orb" } },
      { value: "Ghastly Eye Jewel · normal · ilvl 83", label: "bases · 1c · 526/d", listing: low },
      { value: "Ghastly Eye Jewel · normal · ilvl 86", label: "bases · 2836c · 6/d", listing: high },
    ]);
  });

  it("joins the labels of two listings that read the same", () => {
    expect(
      mergePriceNames(
        [{ name: "Divine Orb", label: "currency", listing: { name: "Divine Orb" } }],
        [{ name: "Divine Orb", label: "exchange", listing: { name: "Divine Orb" } }],
      ),
    ).toEqual([{ value: "Divine Orb", label: "currency · exchange", listing: { name: "Divine Orb" } }]);
  });

  it("gives nothing for two empty lists", () => {
    expect(mergePriceNames([], [])).toEqual([]);
  });
});
