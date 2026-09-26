import { describe, expect, it } from "@jest/globals";
import { collectBaseTypes, seedNames } from "./validate-base-types.ts";

describe("seedNames", () => {
  it("collects every seed row's name and skips rows without one", () => {
    expect(seedNames({ a: { name: "Ruby Ring" }, b: { name: 3 }, c: null })).toEqual(new Set(["Ruby Ring"]));
  });

  it("has no names for a table that is not an object", () => {
    expect(seedNames([{ name: "Ruby Ring" }])).toEqual(new Set());
  });
});

describe("collectBaseTypes", () => {
  const seeds = new Set(["Ruby Ring"]);

  it("accepts a base type that names a seed row", () => {
    expect(collectBaseTypes({ "authored/a": { baseType: "Ruby Ring" } }, seeds, new Set())).toEqual([]);
  });

  it("reports a rejected base type even when a seed row carries it", () => {
    expect(collectBaseTypes({ "authored/a": { baseType: "Ruby Ring" } }, seeds, new Set(["Ruby Ring"]))).toEqual([
      { key: "authored/a", problem: 'baseType "Ruby Ring" is one the client rejects' },
    ]);
  });

  it("reports a base type that no seed row carries", () => {
    expect(collectBaseTypes({ "authored/a": { baseType: "Opal Ring" } }, seeds, new Set())).toEqual([
      { key: "authored/a", problem: 'baseType "Opal Ring" is not the name of any seed row' },
    ]);
  });

  it("skips rows with a missing or empty base type, which the shape check reports instead", () => {
    expect(collectBaseTypes({ a: {}, b: { baseType: "" }, c: "row" }, seeds, new Set())).toEqual([]);
  });

  it("reports nothing for a table that is not an object", () => {
    expect(collectBaseTypes(null, seeds, new Set())).toEqual([]);
  });
});
