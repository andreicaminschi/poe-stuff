import { describe, it, expect } from "@jest/globals";
import { kindOf } from "./kind-of.ts";

describe("kindOf", () => {
  it("edits a condition filled from the row's name as filled from the name, whatever value it carries", () => { // from is checked before value
    expect(kindOf({ condition: "BaseType", from: "name", value: 1 })).toBe("from-name");
  });

  it("edits a condition filled from anything else as filled from the base types", () => { // any other from is baseTypes
    expect(kindOf({ condition: "BaseType", from: "anything" })).toBe("from-baseTypes");
  });

  it("edits a condition whose value is null as a removal", () => { // null, not undefined
    expect(kindOf({ condition: "Corrupted", value: null })).toBe("remove");
  });

  it("edits an empty list as a list", () => { // an empty array is still an array
    expect(kindOf({ condition: "Class", value: [] })).toBe("list");
  });

  it("edits zero as a number", () => { // zero is not treated as missing
    expect(kindOf({ condition: "ItemLevel", value: 0 })).toBe("number");
  });

  it("edits false as a flag", () => { // false is not treated as missing
    expect(kindOf({ condition: "Corrupted", value: false })).toBe("flag");
  });

  it("edits a condition with no value as text", () => { // text is the fallback
    expect(kindOf({ condition: "Corrupted" })).toBe("text");
  });
});
