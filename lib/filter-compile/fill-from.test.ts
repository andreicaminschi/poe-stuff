import { describe, it, expect } from "@jest/globals";
import { fillFrom } from "./fill-from.ts";

const row = { name: "Vaal Regalia", baseTypes: ["Vaal Regalia", "Sadist Garb"] };

describe("fillFrom", () => {
  it("fills a name reference with the row's name and drops the reference", () => {
    const result = fillFrom([{ condition: "BaseType", from: "name", level: "item" }], row);

    expect(result).toEqual({
      conditions: [{ condition: "BaseType", value: "Vaal Regalia", level: "item" }],
      problems: [],
    });
  });

  it("fills a base types reference with a copy of the row's base types", () => {
    const result = fillFrom([{ condition: "BaseType", from: "baseTypes", level: "item" }], row);

    expect(result.conditions[0]?.value).toEqual(["Vaal Regalia", "Sadist Garb"]);
    expect(result.conditions[0]?.value).not.toBe(row.baseTypes);
  });

  it("reports an authored value when the condition also reads from the row", () => {
    const result = fillFrom([{ condition: "BaseType", value: "Other", from: "name", level: "item" }], row);

    expect(result.problems).toEqual(['BaseType has both a value and from "name"']);
  });

  it("leaves conditions without a reference untouched", () => {
    const condition = { condition: "Rarity", value: "Rare", level: "item" as const };

    expect(fillFrom([condition], row).conditions[0]).toBe(condition);
  });

  it("reports an empty name when a condition reads it", () => {
    const result = fillFrom([{ condition: "BaseType", from: "name", level: "item" }], { ...row, name: "" });

    expect(result.problems).toEqual(["reads its name, which is empty"]);
  });

  it("reports a quote in the name when a condition reads it", () => {
    const result = fillFrom([{ condition: "BaseType", from: "name", level: "item" }], { ...row, name: 'A "B"' });

    expect(result.problems).toEqual(["has a quote in its name, which a .filter line cannot hold"]);
  });

  it("does not check the name when nothing reads it", () => {
    const result = fillFrom([{ condition: "Rarity", value: "Rare", level: "item" }], { name: "", baseTypes: [] });

    expect(result.problems).toEqual([]);
  });

  it("reports empty base types when a condition reads them", () => {
    const result = fillFrom([{ condition: "BaseType", from: "baseTypes", level: "item" }], { ...row, baseTypes: [] });

    expect(result.problems).toEqual(["reads its base types, which are empty"]);
  });

  it("reports a quote in any base type when a condition reads them", () => {
    const result = fillFrom([{ condition: "BaseType", from: "baseTypes", level: "item" }], {
      ...row,
      baseTypes: ["Fine", 'Bad "one"'],
    });

    expect(result.problems).toEqual(["has a quote in a base type, which a .filter line cannot hold"]);
  });

  it("reports an unknown reference and drops the condition", () => {
    const result = fillFrom([{ condition: "BaseType", from: "key", level: "item" }], row);

    expect(result.conditions).toEqual([]);
    expect(result.problems).toEqual(['reads "key", which is not name or baseTypes']);
  });

  it("lists name problems before base type problems before unknown references", () => {
    const result = fillFrom(
      [
        { condition: "X", from: "other", level: "item" },
        { condition: "BaseType", from: "baseTypes", level: "item" },
        { condition: "BaseType", from: "name", level: "item" },
      ],
      { name: "", baseTypes: [] },
    );

    expect(result.problems).toEqual([
      "reads its name, which is empty",
      "reads its base types, which are empty",
      'reads "other", which is not name or baseTypes',
    ]);
  });

  it("reports a name problem once even when two conditions read the name", () => {
    const result = fillFrom(
      [
        { condition: "BaseType", from: "name", level: "item" },
        { condition: "Class", from: "name", level: "item" },
      ],
      { ...row, name: "" },
    );

    expect(result.problems).toHaveLength(1);
  });
});
