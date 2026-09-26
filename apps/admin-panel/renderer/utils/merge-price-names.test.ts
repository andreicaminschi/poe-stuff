import { describe, it, expect } from "@jest/globals";
import { mergePriceNames } from "./merge-price-names.ts";

describe("mergePriceNames", () => {
  it("merges a listing and an exchange name that describe the same, listing label first", () => {
    const options = mergePriceNames(
      [{ name: "Chaos", label: "listing", listing: { name: "Chaos Orb" } }],
      [{ name: "Chaos", label: "exchange", listing: { name: "Chaos Orb" } }],
    );

    expect(options).toEqual([{ value: "Chaos Orb", label: "listing · exchange", listing: { name: "Chaos Orb" } }]);
  });

  it("keeps the last listing seen for a merged value", () => {
    const options = mergePriceNames(
      [{ name: "a", label: "one", listing: { name: "A", synthesised: false } }],
      [{ name: "a", label: "two", listing: { name: "A" } }],
    );

    expect(options[0]?.listing).toEqual({ name: "A" });
  });

  it("sorts options by their text", () => {
    const options = mergePriceNames(
      [
        { name: "b", label: "l", listing: { name: "Beta" } },
        { name: "a", label: "l", listing: { name: "alpha" } },
      ],
      [],
    );

    expect(options.map((option) => option.value)).toEqual(["alpha", "Beta"]);
  });

  it("returns no options for no names", () => {
    expect(mergePriceNames([], [])).toEqual([]);
  });
});
