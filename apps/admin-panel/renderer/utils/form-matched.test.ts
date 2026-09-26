import { describe, it, expect } from "@jest/globals";
import { formMatched } from "./form-matched.ts";

describe("formMatched", () => {
  const discovered = { name: "d", conditions: [], listing: { name: "x", itemLevel: 86 } };

  it("matches a variant that links the same listing under another name", () => {
    expect(formMatched(discovered, [{ name: "v", conditions: [], listing: { name: "y", itemLevel: 86 } }])).toBe(true);
  });

  it("matches when the listing is one of several a variant links", () => {
    const variant = { name: "v", conditions: [], listing: [{ itemLevel: 1 }, { itemLevel: 86 }] };

    expect(formMatched(discovered, [variant])).toBe(true);
  });

  it("does not match when no variant links the listing", () => {
    expect(formMatched(discovered, [{ name: "v", conditions: [], listing: { itemLevel: 85 } }])).toBe(false);
  });

  it("never matches a discovered form that has no listing", () => {
    expect(formMatched({ name: "d", conditions: [] }, [{ name: "v", conditions: [] }])).toBe(false);
  });
});
