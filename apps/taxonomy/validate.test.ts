import { describe, expect, it } from "@jest/globals";
import { collect, TableShapeError, throwFirst } from "./validate.ts";

describe("collect", () => {
  it("reports one problem per bad row and none for good rows, in key order", () => {
    const problems = collect({ a: 1, b: 2, c: 3 }, "table", (_key, row) => (row === 2 ? null : "bad"));

    expect(problems).toEqual([
      { key: "a", problem: "bad" },
      { key: "c", problem: "bad" },
    ]);
  });

  it("throws a shape error for a table that is a list", () => {
    expect(() => collect([], "table", () => null)).toThrow(TableShapeError);
  });

  it("throws a shape error for a missing table", () => {
    expect(() => collect(null, "table", () => null)).toThrow("table is not an object");
  });
});

describe("throwFirst", () => {
  it("throws only the first problem, named with its source and key", () => {
    expect(() =>
      throwFirst("items", [
        { key: "a", problem: "is broken" },
        { key: "b", problem: "is also broken" },
      ]),
    ).toThrow('items: "a" is broken');
  });

  it("does nothing when there are no problems", () => {
    expect(() => throwFirst("items", [])).not.toThrow();
  });
});
