import { describe, expect, it } from "@jest/globals";
import { collectAuthoredTable, validateAuthoredTable } from "./validate-authored.ts";

const row = (extra: Record<string, unknown> = {}) => ({
  name: "Mirror Ring",
  baseType: "Ruby Ring",
  category: "rings",
  subcategory: null,
  reason: "why",
  ...extra,
});

const problemOf = (key: string, value: unknown) => collectAuthoredTable({ [key]: value }, "authored")[0]?.problem;

describe("collectAuthoredTable", () => {
  it("accepts a complete row keyed by a slug", () => {
    expect(collectAuthoredTable({ "authored/mirror-ring": row() }, "authored")).toEqual([]);
  });

  it.each([
    ["no slug after the prefix", "authored/"],
    ["the wrong prefix", "custom/mirror-ring"],
    ["capitals in the slug", "authored/Mirror-Ring"],
    ["a trailing dash", "authored/mirror-"],
    ["a second slash", "authored/a/b"],
  ])("refuses a key with %s", (_label, key) => {
    expect(problemOf(key, row())).toBe('is not keyed "authored/" followed by a slug');
  });

  it("refuses a row that is not an object", () => {
    expect(problemOf("authored/a", [])).toBe("is not an object");
  });

  it("names every unknown field", () => {
    expect(problemOf("authored/a", row({ price: 1, tier: 2 }))).toBe("has unknown fields: price, tier");
  });

  it.each([
    ["name", "name must be a non-empty string"],
    ["baseType", "baseType must be a non-empty string"],
    ["category", "category must be a non-empty string"],
    ["reason", "reason must be a non-empty string"],
    ["subcategory", "subcategory must be a non-empty string or null"],
  ])("refuses an empty %s", (field, problem) => {
    expect(problemOf("authored/a", row({ [field]: "" }))).toBe(problem);
  });

  it("refuses a missing subcategory, which must be null rather than absent", () => {
    const { subcategory: _dropped, ...rest } = row();

    expect(problemOf("authored/a", rest)).toBe("subcategory must be a non-empty string or null");
  });

  it.each(["excluded", "quest", "unpriceable"])("refuses a %s flag that is not a boolean", (flag) => {
    expect(problemOf("authored/a", row({ [flag]: "yes" }))).toBe(`${flag} must be a boolean when it is present`);
  });

  it("refuses an empty replaces list", () => {
    expect(problemOf("authored/a", row({ replaces: [] }))).toBe("replaces nothing; delete the key instead");
  });

  it("refuses a replaces list holding an empty string", () => {
    expect(problemOf("authored/a", row({ replaces: ["a", ""] }))).toBe("replaces must be a list of non-empty strings");
  });

  it("passes on the conditions problem as it is", () => {
    expect(problemOf("authored/a", row({ conditions: {} }))).toBe("conditions is not a list");
  });

  it("passes on the listing problem as it is", () => {
    expect(problemOf("authored/a", row({ listing: {} }))).toBe("listing matches nothing");
  });
});

describe("validateAuthoredTable", () => {
  it("returns the table unchanged when it is valid", () => {
    const table = { "authored/a": row() };

    expect(validateAuthoredTable(table, "authored")).toBe(table);
  });

  it("throws the first problem with its source", () => {
    expect(() => validateAuthoredTable({ bad: row() }, "authored.manual")).toThrow('authored.manual: "bad" is not keyed');
  });
});
