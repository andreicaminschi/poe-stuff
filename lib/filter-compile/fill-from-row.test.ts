import { describe, it, expect } from "@jest/globals";
import { fillFromRow } from "./fill-from-row.ts";

const row = { name: "Vaal Regalia", baseTypes: ["Vaal Regalia", "Sadist Garb"] };

describe("fillFromRow", () => {
  describe("filling", () => {
    it("writes the row's name into a condition that reads the name", () => {
      const conditions = [{ condition: "BaseType", from: "name", level: "item" }] as const;

      const result = fillFromRow(conditions, row);

      expect(result).toEqual({
        conditions: [{ condition: "BaseType", value: "Vaal Regalia", level: "item" }],
        problems: [],
      }); // `from` removed once filled
    });

    it("writes a copy of the row's base types into a condition that reads them", () => {
      const conditions = [{ condition: "BaseType", from: "baseTypes", level: "item" }] as const;

      const result = fillFromRow(conditions, row);

      expect(result.conditions[0]?.value).toEqual(["Vaal Regalia", "Sadist Garb"]);
      expect(result.conditions[0]?.value).not.toBe(row.baseTypes); // caller's array is never shared
    });

    it("passes a condition that reads nothing from the row through as the same object", () => {
      const condition = { condition: "Rarity", value: "Rare", level: "item" as const };

      const result = fillFromRow([condition], row);

      expect(result.conditions[0]).toBe(condition); // identity, not a copy
    });

    it("drops a condition that reads a field other than name or base types and reports it", () => {
      const conditions = [{ condition: "BaseType", from: "key", level: "item" }] as const;

      const result = fillFromRow(conditions, row);

      expect(result).toEqual({ conditions: [], problems: ["reads \"key\", which is not name or baseTypes"] }); // never a valueless line
    });
  });

  describe("problems", () => {
    it("reports a condition that has both its own value and reads from the row", () => {
      const conditions = [{ condition: "BaseType", value: "Other", from: "name", level: "item" }] as const;

      const result = fillFromRow(conditions, row);

      expect(result.problems).toEqual(["BaseType has both a value and from \"name\""]); // row still wins in the output
    });

    it("reports an empty name when a condition reads it", () => {
      const conditions = [{ condition: "BaseType", from: "name", level: "item" }] as const;

      const result = fillFromRow(conditions, { ...row, name: "" });

      expect(result.problems).toEqual(["reads its name, which is empty"]);
    });

    it("reports a name with a double quote in it, which a filter line cannot hold", () => {
      const conditions = [{ condition: "BaseType", from: "name", level: "item" }] as const;

      const result = fillFromRow(conditions, { ...row, name: "A \"B\"" });

      expect(result.problems).toEqual(["has a quote in its name, which a .filter line cannot hold"]);
    });

    it("says nothing about an empty name and base types when no condition reads them", () => {
      const conditions = [{ condition: "Rarity", value: "Rare", level: "item" }] as const;

      const result = fillFromRow(conditions, { name: "", baseTypes: [] });

      expect(result.problems).toEqual([]); // checks run only for what is read
    });

    it("reports an empty base type list when a condition reads it", () => {
      const conditions = [{ condition: "BaseType", from: "baseTypes", level: "item" }] as const;

      const result = fillFromRow(conditions, { ...row, baseTypes: [] });

      expect(result.problems).toEqual(["reads its base types, which are empty"]);
    });

    it("reports a double quote in the second of two base types", () => {
      const conditions = [{ condition: "BaseType", from: "baseTypes", level: "item" }] as const;

      const result = fillFromRow(conditions, { ...row, baseTypes: ["Fine", "Bad \"one\""] });

      expect(result.problems).toEqual(["has a quote in a base type, which a .filter line cannot hold"]); // any, not just the first
    });

    it("lists name problems, then base type problems, then unknown fields, whatever order the conditions came in", () => {
      const conditions = [
        { condition: "X", from: "other", level: "item" },
        { condition: "BaseType", from: "baseTypes", level: "item" },
        { condition: "BaseType", from: "name", level: "item" },
      ] as const;

      const result = fillFromRow(conditions, { name: "", baseTypes: [] });

      expect(result.problems).toEqual([
        "reads its name, which is empty",
        "reads its base types, which are empty",
        "reads \"other\", which is not name or baseTypes",
      ]); // fixed report order
    });

    it("reports an empty name once even when two conditions read it", () => {
      const conditions = [
        { condition: "BaseType", from: "name", level: "item" },
        { condition: "Class", from: "name", level: "item" },
      ] as const;

      const result = fillFromRow(conditions, { ...row, name: "" });

      expect(result.problems).toEqual(["reads its name, which is empty"]); // checked per row, not per condition
    });
  });
});
