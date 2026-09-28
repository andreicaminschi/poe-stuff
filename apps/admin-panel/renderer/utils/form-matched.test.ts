import { describe, it, expect } from "@jest/globals";
import { formMatched } from "./form-matched.ts";

describe("formMatched", () => {
  const discovered = { name: "d", conditions: [], listing: { name: "x", itemLevel: 86 } };

  it("matches a variant that links the same listing under another name", () => { // the name is not part of the comparison
    expect(formMatched(discovered, [{ name: "v", conditions: [], listing: { name: "y", itemLevel: 86 } }])).toBe(true);
  });

  it("matches when the listing is one of several a variant links", () => { // a variant's listing may be a list
    const variant = { name: "v", conditions: [], listing: [{ itemLevel: 1 }, { itemLevel: 86 }] };

    expect(formMatched(discovered, [variant])).toBe(true);
  });

  it("does not match a variant linked at item level 85 instead of 86", () => { // every other field must agree
    expect(formMatched(discovered, [{ name: "v", conditions: [], listing: { itemLevel: 85 } }])).toBe(false);
  });

  it("does not match when there are no variants", () => { // some() over nothing is false
    expect(formMatched(discovered, [])).toBe(false);
  });

  it("never matches a discovered form that has no listing", () => { // nothing wanted, nothing matched
    expect(formMatched({ name: "d", conditions: [] }, [{ name: "v", conditions: [] }])).toBe(false);
  });
});
