import { describe, it, expect } from "@jest/globals";
import { conditionLine } from "./condition-line.ts";

describe("conditionLine", () => {
  describe("lookup", () => {
    it("refuses a condition the filter language does not know", () => {
      expect(conditionLine({ condition: "Nope", value: 1 })).toEqual({ problem: '"Nope" is not a filter condition' });
    });

    it("accepts any casing and writes the canonical name", () => {
      expect(conditionLine({ condition: "itemlevel", value: 80 })).toEqual({ line: "ItemLevel 80" });
    });

    it("refuses a missing value", () => {
      expect(conditionLine({ condition: "ItemLevel" })).toEqual({ problem: "ItemLevel has no value" });
    });

    it("refuses a null value", () => {
      expect(conditionLine({ condition: "ItemLevel", value: null })).toEqual({ problem: "ItemLevel has no value" });
    });
  });

  describe("operator", () => {
    it("writes the operator between the name and the value when one is given", () => {
      expect(conditionLine({ condition: "ItemLevel", operator: ">=", value: 75 })).toEqual({ line: "ItemLevel >= 75" });
    });
  });

  describe("string lists", () => {
    it("quotes a single string", () => {
      expect(conditionLine({ condition: "BaseType", operator: "==", value: "Vaal Regalia" })).toEqual({
        line: 'BaseType == "Vaal Regalia"',
      });
    });

    it("quotes each entry of a list, space separated", () => {
      expect(conditionLine({ condition: "Class", value: ["Rings", "Amulets"] })).toEqual({
        line: 'Class "Rings" "Amulets"',
      });
    });

    it("refuses an empty list", () => {
      expect(conditionLine({ condition: "Class", value: [] })).toEqual({ problem: "Class cannot hold []" });
    });

    it("refuses a string containing a quote", () => {
      expect(conditionLine({ condition: "BaseType", value: 'A "B"' })).toEqual({
        problem: 'BaseType cannot hold "A \\"B\\""',
      });
    });

    it("refuses a number", () => {
      expect(conditionLine({ condition: "BaseType", value: 5 })).toEqual({ problem: "BaseType cannot hold 5" });
    });

    it("refuses an empty string, which would match every item", () => {
      expect(conditionLine({ condition: "BaseType", value: "" })).toEqual({ problem: 'BaseType cannot hold ""' });
    });
  });

  describe("numeric", () => {
    it("writes zero", () => {
      expect(conditionLine({ condition: "ItemLevel", value: 0 })).toEqual({ line: "ItemLevel 0" });
    });

    it("refuses a numeric string", () => {
      expect(conditionLine({ condition: "ItemLevel", value: "80" })).toEqual({ problem: 'ItemLevel cannot hold "80"' });
    });
  });

  describe("boolean", () => {
    it("writes true as True", () => {
      expect(conditionLine({ condition: "Corrupted", value: true })).toEqual({ line: "Corrupted True" });
    });

    it("writes false as False", () => {
      expect(conditionLine({ condition: "Corrupted", value: false })).toEqual({ line: "Corrupted False" });
    });

    it("refuses the string True", () => {
      expect(conditionLine({ condition: "Corrupted", value: "True" })).toEqual({ problem: 'Corrupted cannot hold "True"' });
    });
  });

  describe("ordered", () => {
    it("writes a string bare", () => {
      expect(conditionLine({ condition: "Rarity", operator: "<=", value: "Rare" })).toEqual({ line: "Rarity <= Rare" });
    });

    it("writes a list bare and space separated", () => {
      expect(conditionLine({ condition: "Rarity", value: ["Normal", "Magic"] })).toEqual({ line: "Rarity Normal Magic" });
    });

    it("refuses an empty list", () => {
      expect(conditionLine({ condition: "Rarity", value: [] })).toEqual({ problem: "Rarity cannot hold []" });
    });

    it("refuses a number", () => {
      expect(conditionLine({ condition: "Rarity", value: 3 })).toEqual({ problem: "Rarity cannot hold 3" });
    });

    it("refuses a value outside the rarity order", () => {
      expect(conditionLine({ condition: "Rarity", value: "Legendary" })).toEqual({ problem: 'Rarity cannot hold "Legendary"' });
    });
  });

  describe("sockets", () => {
    it("writes a number bare", () => {
      expect(conditionLine({ condition: "Sockets", operator: ">=", value: 6 })).toEqual({ line: "Sockets >= 6" });
    });

    it("writes a string bare", () => {
      expect(conditionLine({ condition: "SocketGroup", value: "RGB" })).toEqual({ line: "SocketGroup RGB" });
    });

    it("refuses a list", () => {
      expect(conditionLine({ condition: "SocketGroup", value: ["RGB"] })).toEqual({ problem: 'SocketGroup cannot hold ["RGB"]' });
    });
  });

  describe("gem", () => {
    it("writes a boolean as True or False", () => {
      expect(conditionLine({ condition: "TransfiguredGem", value: true })).toEqual({ line: "TransfiguredGem True" });
    });

    it("quotes a gem name", () => {
      expect(conditionLine({ condition: "TransfiguredGem", value: "Arc of Surging" })).toEqual({
        line: 'TransfiguredGem "Arc of Surging"',
      });
    });

    it("refuses a number", () => {
      expect(conditionLine({ condition: "TransfiguredGem", value: 1 })).toEqual({ problem: "TransfiguredGem cannot hold 1" });
    });
  });
});
