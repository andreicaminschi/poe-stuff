import { describe, expect, it } from "@jest/globals";
import { collectCategoryTable, conditionsProblem, validateCategoryTable } from "./validate-conditions.ts";

describe("conditionsProblem", () => {
  it("accepts an empty list", () => {
    expect(conditionsProblem([])).toBeNull();
  });

  it("refuses conditions that are not a list", () => {
    expect(conditionsProblem({})).toBe("conditions is not a list");
  });

  it("refuses a condition that is not an object", () => {
    expect(conditionsProblem(["Class"])).toBe("is not an object");
  });

  it("names unknown fields on a condition", () => {
    expect(conditionsProblem([{ condition: "Class", value: "Rings", note: 1 }])).toBe("has unknown fields: note");
  });

  it("refuses an empty condition name", () => {
    expect(conditionsProblem([{ condition: "", value: 1 }])).toBe("condition must be a non-empty string");
  });

  it("refuses an empty operator", () => {
    expect(conditionsProblem([{ condition: "ItemLevel", operator: "", value: 1 }])).toBe(
      "operator must be a non-empty string when it is present",
    );
  });

  it("refuses a condition name that is not a filter condition", () => {
    expect(conditionsProblem([{ condition: "NotACondition", value: 1 }])).toBe('"NotACondition" is not a filter condition');
  });

  it("refuses a condition with both a value and a from", () => {
    expect(conditionsProblem([{ condition: "BaseType", value: "x", from: "name" }])).toBe(
      "BaseType has both value and from, which are the two ways to say the same thing",
    );
  });

  it("refuses a condition with neither a value nor a from", () => {
    expect(conditionsProblem([{ condition: "BaseType" }])).toBe("BaseType has neither value nor from");
  });

  it("counts an undefined value as missing", () => {
    expect(conditionsProblem([{ condition: "BaseType", value: undefined }])).toBe("BaseType has neither value nor from");
  });

  it("refuses a from that is not a row field", () => {
    expect(conditionsProblem([{ condition: "BaseType", from: "category" }])).toBe(
      'BaseType reads from "category", which is not a row field. Known: name, baseTypes',
    );
  });

  it("refuses a list value that holds a number", () => {
    expect(conditionsProblem([{ condition: "BaseType", value: ["a", 1] }])).toBe(
      "BaseType has a value that is not a string, number, boolean, list of strings or null",
    );
  });

  it("accepts a null value, which removes an inherited condition", () => {
    expect(conditionsProblem([{ condition: "BaseType", value: null }])).toBeNull();
  });

  it("refuses the same condition and operator twice", () => {
    expect(
      conditionsProblem([
        { condition: "ItemLevel", operator: ">=", value: 1 },
        { condition: "ItemLevel", operator: ">=", value: 2 },
      ]),
    ).toBe("ItemLevel >= is authored twice in one list, and the second wins silently");
  });

  it("treats a missing operator as equals when looking for repeats", () => {
    expect(
      conditionsProblem([
        { condition: "Class", value: "Rings" },
        { condition: "Class", operator: "==", value: "Amulets" },
      ]),
    ).toBe("Class == is authored twice in one list, and the second wins silently");
  });

  it("allows one condition twice with different operators", () => {
    expect(
      conditionsProblem([
        { condition: "ItemLevel", operator: ">=", value: 1 },
        { condition: "ItemLevel", operator: "<=", value: 2 },
      ]),
    ).toBeNull();
  });

  it("refuses both Class and BaseType in one list", () => {
    expect(conditionsProblem([{ condition: "Class", value: "Rings" }, { condition: "BaseType", from: "name" }])).toMatch(
      /^authors both Class and BaseType/,
    );
  });

  it("allows Class beside a BaseType that is removed with null", () => {
    expect(conditionsProblem([{ condition: "Class", value: "Rings" }, { condition: "BaseType", value: null }])).toBeNull();
  });
});

const problemOf = (path: string, record: unknown) => collectCategoryTable({ [path]: record }, "categories")[0]?.problem;

describe("collectCategoryTable", () => {
  it("accepts a top-level category and a subcategory", () => {
    expect(collectCategoryTable({ rings: { conditions: [] }, "rings/magic": { conditions: [] } }, "categories")).toEqual([]);
  });

  it.each([
    ["three levels", "a/b/c"],
    ["a trailing space", "rings "],
    ["a leading space in the subcategory", "rings/ magic"],
    ["an empty subcategory", "rings/"],
  ])("refuses a path with %s", (_label, path) => {
    expect(problemOf(path, { conditions: [] })).toMatch(/^is not a category path/);
  });

  it("allows spaces inside a name", () => {
    expect(problemOf("jewels/cluster jewels", { conditions: [] })).toBeUndefined();
  });

  it("refuses a record that is not an object", () => {
    expect(problemOf("rings", [])).toBe("is not an object");
  });

  it("names unknown fields", () => {
    expect(problemOf("rings", { conditions: [], tier: 1 })).toBe("has unknown fields: tier");
  });

  it("requires conditions on every category", () => {
    expect(problemOf("rings", {})).toBe("conditions is not a list");
  });

  it("refuses an empty name", () => {
    expect(problemOf("rings", { conditions: [], name: "" })).toBe("name must be a non-empty string when it is present");
  });

  it("refuses an unknown tiering method", () => {
    expect(problemOf("rings", { conditions: [], tiering: "divine" })).toBe(
      "tiering must be one of chaos, stack-size when it is present",
    );
  });

  it("refuses a catch-all flag that is not a boolean", () => {
    expect(problemOf("rings/rest", { conditions: [], catchAll: "yes" })).toBe("catchAll must be a boolean when it is present");
  });

  describe("order", () => {
    it("refuses an order on a top-level category", () => {
      expect(problemOf("rings", { conditions: [], order: 1 })).toBe("order belongs on a subcategory");
    });

    it("refuses an order on a catch-all subcategory", () => {
      expect(problemOf("rings/rest", { conditions: [], order: 1, catchAll: true })).toBe(
        "a catchAll subcategory always compiles last, so it takes no order",
      );
    });

    it("refuses an order that is not a finite number", () => {
      expect(problemOf("rings/magic", { conditions: [], order: Infinity })).toBe("order must be a number when it is present");
    });

    it("accepts a negative order", () => {
      expect(problemOf("rings/magic", { conditions: [], order: -1 })).toBeUndefined();
    });
  });

  describe("hints", () => {
    it("accepts check and gamble on a top-level category", () => {
      expect(problemOf("rings", { conditions: [], hints: ["check", "gamble"] })).toBeUndefined();
    });

    it("refuses hints on a subcategory", () => {
      expect(problemOf("rings/magic", { conditions: [], hints: ["check"] })).toMatch(/^hints belong on a top-level category/);
    });

    it("refuses hints that are not a list", () => {
      expect(problemOf("rings", { conditions: [], hints: "check" })).toBe("hints must be a list of check, gamble");
    });

    it("names the hints it does not know", () => {
      expect(problemOf("rings", { conditions: [], hints: ["check", "sell"] })).toBe("hints must be check or gamble, not sell");
    });

    it("refuses the same hint twice", () => {
      expect(problemOf("rings", { conditions: [], hints: ["check", "check"] })).toBe("hints lists the same hint twice");
    });
  });

  describe("samples and rejects", () => {
    const sub = (samples: unknown) => problemOf("rings/magic", { conditions: [], samples });

    it("refuses samples on a top-level category", () => {
      expect(problemOf("rings", { conditions: [], samples: [] })).toBe("samples belong on a subcategory");
    });

    it("refuses rejects on a top-level category", () => {
      expect(problemOf("rings", { conditions: [], rejects: [] })).toBe("rejects belong on a subcategory");
    });

    it("accepts an empty list of sample sets", () => {
      expect(sub([])).toBeUndefined();
    });

    it("refuses samples that are not a list", () => {
      expect(sub({})).toBe("samples must be a list of sample sets");
    });

    it("refuses an empty sample set", () => {
      expect(sub([{}])).toBe("each samples set must be a non-empty object");
    });

    it("refuses a property that is not a filter condition", () => {
      expect(sub([{ Colour: { values: ["red"] } }])).toBe('samples names "Colour", which is not a filter condition');
    });

    it("refuses a condition name in the wrong case", () => {
      expect(sub([{ rarity: { values: ["Rare"] } }])).toBe('samples names "rarity", which is not a filter condition');
    });

    it("refuses a property that is not an object", () => {
      expect(sub([{ Rarity: ["Rare"] }])).toBe("samples Rarity is not an object");
    });

    it("names unknown fields on a property", () => {
      expect(sub([{ Rarity: { values: ["Rare"], weight: 1 } }])).toBe("samples Rarity has unknown fields: weight");
    });

    it("refuses both values and from", () => {
      expect(sub([{ BaseType: { values: ["x"], from: "name" } }])).toBe("samples BaseType has both values and from");
    });

    it("refuses a from it cannot read", () => {
      expect(sub([{ BaseType: { from: "category" } }])).toBe(
        'samples BaseType reads from "category". Known: name, baseTypes, conditions',
      );
    });

    it("accepts a from that reads the row's conditions", () => {
      expect(sub([{ BaseType: { from: "conditions" } }])).toBeUndefined();
    });

    it("refuses an empty values list", () => {
      expect(sub([{ Rarity: { values: [] } }])).toBe("samples Rarity needs a non-empty values list or a from");
    });

    it("refuses a rarity outside the game's four", () => {
      expect(sub([{ Rarity: { values: ["Legendary"] } }])).toBe(
        'samples Rarity takes one of Normal, Magic, Rare, Unique, not "Legendary"',
      );
    });

    it("refuses a number written as text", () => {
      expect(sub([{ ItemLevel: { values: ["84"] } }])).toBe('samples ItemLevel takes a number, not "84"');
    });

    it("refuses a boolean written as text", () => {
      expect(sub([{ Corrupted: { values: ["true"] } }])).toBe('samples Corrupted takes true or false, not "true"');
    });

    it("refuses an influence the game does not have", () => {
      expect(sub([{ HasInfluence: { values: ["Searing"] } }])).toMatch(/^samples HasInfluence takes one of Shaper/);
    });

    it("accepts text or a non-empty list of text for a counted condition", () => {
      expect(sub([{ HasEnchantment: { values: ["a", ["b", "c"]] } }])).toBeUndefined();
    });

    it("refuses an empty list for a counted condition", () => {
      expect(sub([{ HasEnchantment: { values: [[]] } }])).toBe("samples HasEnchantment takes text or a list of text, not []");
    });

    it("refuses a list for a text condition", () => {
      expect(sub([{ BaseType: { values: [["a"]] } }])).toBe('samples BaseType takes text, not ["a"]');
    });

    it("labels a bad reject set as rejects", () => {
      expect(problemOf("rings/magic", { conditions: [], rejects: [{ Rarity: { values: [] } }] })).toBe(
        "rejects Rarity needs a non-empty values list or a from",
      );
    });
  });
});

describe("validateCategoryTable", () => {
  it("throws the first problem with its source", () => {
    expect(() => validateCategoryTable({ "a/b/c": { conditions: [] } }, "categories")).toThrow('categories: "a/b/c" is not a category path');
  });
});
