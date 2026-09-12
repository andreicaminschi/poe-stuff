import { describe, it, expect } from "@jest/globals";
import type { Variant } from "../../api/taxonomy/types.ts";
import { formMatched } from "./form-matched.ts";

const variant = (listing?: Variant["listing"]): Variant => ({
  name: "v",
  conditions: [],
  ...(listing === undefined ? {} : { listing }),
});

describe("formMatched", () => {
  it("matches a variant writing the same keys, whatever its name key", () => {
    expect(formMatched(variant({ itemLevel: 86 }), [variant({ name: "Other", itemLevel: 86 })])).toBe(true);
  });

  it("does not match a different value or an extra key", () => {
    expect(formMatched(variant({ itemLevel: 86 }), [variant({ itemLevel: 85 })])).toBe(false);
    expect(formMatched(variant({ itemLevel: 86 }), [variant({ itemLevel: 86, linkCount: 6 })])).toBe(false);
  });

  it("never matches a discovered variant with no listing", () => {
    expect(formMatched(variant(), [variant()])).toBe(false);
  });
});
