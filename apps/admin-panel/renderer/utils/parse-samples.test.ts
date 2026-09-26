import { describe, it, expect } from "@jest/globals";
import { parseSamples } from "./parse-samples.ts";

describe("parseSamples", () => {
  it("reads blank text as no sets", () => {
    expect(parseSamples("  \n")).toEqual({ samples: [] });
  });

  it("reads a list of objects", () => {
    expect(parseSamples('[{"Rarity":"Rare"},{}]')).toEqual({ samples: [{ Rarity: "Rare" }, {}] });
  });

  it("reports text that is not JSON under the given label", () => {
    const parsed = parseSamples("[", "Rejects");

    expect("problem" in parsed && parsed.problem.startsWith("Rejects is not JSON: ")).toBe(true);
  });

  it("refuses a single object that is not in a list", () => {
    expect(parseSamples("{}")).toEqual({ problem: "Samples must be a list of objects." });
  });

  it("refuses a list holding null, an array or a number", () => {
    expect(parseSamples("[null]")).toEqual({ problem: "Samples must be a list of objects." });
    expect(parseSamples("[[]]")).toEqual({ problem: "Samples must be a list of objects." });
    expect(parseSamples("[1]")).toEqual({ problem: "Samples must be a list of objects." });
  });

  it("accepts an empty list", () => {
    expect(parseSamples("[]")).toEqual({ samples: [] });
  });
});
