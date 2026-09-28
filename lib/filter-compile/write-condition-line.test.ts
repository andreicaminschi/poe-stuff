import { describe, it, expect } from "@jest/globals";
import { writeConditionLine, writeConditionLines } from "./write-condition-line.ts";

describe("writeConditionLine", () => {
  describe("finding the condition", () => {
    it("refuses a condition the filter language does not have", () => {
      const result = writeConditionLine({ condition: "Nope", value: 1 });

      expect(result).toEqual({ problem: "\"Nope\" is not a filter condition" });
    });

    it("accepts a condition name in lower case and writes it the way the game spells it", () => {
      const result = writeConditionLine({ condition: "itemlevel", value: 80 });

      expect(result).toEqual({ line: "ItemLevel 80" }); // looked up by lower case
    });

    it("refuses a condition with no value", () => {
      const result = writeConditionLine({ condition: "ItemLevel" });

      expect(result).toEqual({ problem: "ItemLevel has no value" });
    });

    it("refuses a condition whose value was removed to null", () => {
      const result = writeConditionLine({ condition: "ItemLevel", value: null });

      expect(result).toEqual({ problem: "ItemLevel has no value" }); // null is a removal marker, not a value
    });
  });

  describe("operator", () => {
    it("writes the operator between the name and the value", () => {
      const result = writeConditionLine({ condition: "ItemLevel", operator: ">=", value: 75 });

      expect(result).toEqual({ line: "ItemLevel >= 75" });
    });
  });

  describe("names and classes", () => {
    it("puts a single name in double quotes", () => {
      const result = writeConditionLine({ condition: "BaseType", operator: "==", value: "Vaal Regalia" });

      expect(result).toEqual({ line: "BaseType == \"Vaal Regalia\"" });
    });

    it("quotes each of two classes and separates them with a space", () => {
      const result = writeConditionLine({ condition: "Class", value: ["Rings", "Amulets"] });

      expect(result).toEqual({ line: "Class \"Rings\" \"Amulets\"" });
    });

    it("refuses an empty list of classes", () => {
      const result = writeConditionLine({ condition: "Class", value: [] });

      expect(result).toEqual({ problem: "Class cannot hold []" }); // would be a bare keyword
    });

    it("refuses a name that holds a double quote", () => {
      const result = writeConditionLine({ condition: "BaseType", value: "A \"B\"" });

      expect(result).toEqual({ problem: "BaseType cannot hold \"A \\\"B\\\"\"" }); // no escaping in .filter
    });

    it("refuses a number where a name belongs", () => {
      const result = writeConditionLine({ condition: "BaseType", value: 5 });

      expect(result).toEqual({ problem: "BaseType cannot hold 5" });
    });

    it("refuses an empty name, which would match every item", () => {
      const result = writeConditionLine({ condition: "BaseType", value: "" });

      expect(result).toEqual({ problem: "BaseType cannot hold \"\"" }); // "" is a substring of everything
    });
  });

  describe("numbers", () => {
    it("writes an item level of zero", () => {
      const result = writeConditionLine({ condition: "ItemLevel", value: 0 });

      expect(result).toEqual({ line: "ItemLevel 0" }); // falsy but valid
    });

    it("refuses a number written as text", () => {
      const result = writeConditionLine({ condition: "ItemLevel", value: "80" });

      expect(result).toEqual({ problem: "ItemLevel cannot hold \"80\"" }); // no coercion
    });
  });

  describe("yes-or-no conditions", () => {
    it("writes true as True", () => {
      const result = writeConditionLine({ condition: "Corrupted", value: true });

      expect(result).toEqual({ line: "Corrupted True" });
    });

    it("writes false as False", () => {
      const result = writeConditionLine({ condition: "Corrupted", value: false });

      expect(result).toEqual({ line: "Corrupted False" }); // falsy but valid
    });

    it("refuses the word True written as text", () => {
      const result = writeConditionLine({ condition: "Corrupted", value: "True" });

      expect(result).toEqual({ problem: "Corrupted cannot hold \"True\"" });
    });
  });

  describe("rarity", () => {
    it("writes a rarity without quotes", () => {
      const result = writeConditionLine({ condition: "Rarity", operator: "<=", value: "Rare" });

      expect(result).toEqual({ line: "Rarity <= Rare" });
    });

    it("writes two rarities without quotes, separated by a space", () => {
      const result = writeConditionLine({ condition: "Rarity", value: ["Normal", "Magic"] });

      expect(result).toEqual({ line: "Rarity Normal Magic" });
    });

    it("splits a rarity string on spaces and checks each word", () => {
      const result = writeConditionLine({ condition: "Rarity", value: "Normal Legendary" });

      expect(result).toEqual({ problem: "Rarity cannot hold \"Normal Legendary\"" }); // split on whitespace
    });

    it("refuses an empty list of rarities", () => {
      const result = writeConditionLine({ condition: "Rarity", value: [] });

      expect(result).toEqual({ problem: "Rarity cannot hold []" });
    });

    it("refuses a number where a rarity belongs", () => {
      const result = writeConditionLine({ condition: "Rarity", value: 3 });

      expect(result).toEqual({ problem: "Rarity cannot hold 3" });
    });

    it("refuses a rarity the game does not have", () => {
      const result = writeConditionLine({ condition: "Rarity", value: "Legendary" });

      expect(result).toEqual({ problem: "Rarity cannot hold \"Legendary\"" }); // checked against the registry order
    });
  });

  describe("sockets", () => {
    it("writes a socket count without quotes", () => {
      const result = writeConditionLine({ condition: "Sockets", operator: ">=", value: 6 });

      expect(result).toEqual({ line: "Sockets >= 6" });
    });

    it("writes socket colours without quotes", () => {
      const result = writeConditionLine({ condition: "SocketGroup", value: "RGB" });

      expect(result).toEqual({ line: "SocketGroup RGB" });
    });

    it("refuses a list of socket groups", () => {
      const result = writeConditionLine({ condition: "SocketGroup", value: ["RGB"] });

      expect(result).toEqual({ problem: "SocketGroup cannot hold [\"RGB\"]" });
    });
  });

  describe("transfigured gems", () => {
    it("writes true as True", () => {
      const result = writeConditionLine({ condition: "TransfiguredGem", value: true });

      expect(result).toEqual({ line: "TransfiguredGem True" }); // gem kind accepts a boolean
    });

    it("puts a gem name in double quotes", () => {
      const result = writeConditionLine({ condition: "TransfiguredGem", value: "Arc of Surging" });

      expect(result).toEqual({ line: "TransfiguredGem \"Arc of Surging\"" }); // ...or a name list
    });

    it("refuses a number", () => {
      const result = writeConditionLine({ condition: "TransfiguredGem", value: 1 });

      expect(result).toEqual({ problem: "TransfiguredGem cannot hold 1" });
    });
  });
});

describe("writeConditionLines", () => {
  it("writes every condition as a line, in order", () => {
    const conditions = [
      { condition: "Class", value: "Rings" },
      { condition: "ItemLevel", operator: ">=", value: 75 },
    ];

    const result = writeConditionLines(conditions);

    expect(result).toEqual({ lines: ["Class \"Rings\"", "ItemLevel >= 75"] });
  });

  it("writes no lines for no conditions", () => {
    const result = writeConditionLines([]);

    expect(result).toEqual({ lines: [] }); // degenerate, not a problem
  });

  it("stops at the first condition that cannot be written and reports only that one", () => {
    const conditions = [
      { condition: "Class", value: "Rings" },
      { condition: "Nope", value: 1 },
      { condition: "ItemLevel", value: "x" },
    ];

    const result = writeConditionLines(conditions);

    expect(result).toEqual({ problem: "\"Nope\" is not a filter condition" }); // early return
  });

  it("refuses a value with a hash in it, which the game would read as the start of a comment", () => {
    const conditions = [{ condition: "BaseType", value: "Ring #2" }];

    const result = writeConditionLines(conditions);

    expect(result).toEqual({ problem: "has a # in a value, which would start a comment" }); // single line passes, list fails
  });
});
