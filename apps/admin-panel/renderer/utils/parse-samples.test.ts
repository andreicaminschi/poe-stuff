import { describe, it, expect } from "@jest/globals";
import { parseSamples } from "./parse-samples.ts";

const NOT_A_LIST = { problem: "Samples must be a list of objects." };

describe("parseSamples", () => {
  it("reads blank text as no sets", () => {
    const parsed = parseSamples("  \n");

    expect(parsed).toEqual({ samples: [] }); // whitespace never reaches JSON.parse
  });

  it("reads an empty list as no sets", () => {
    const parsed = parseSamples("[]");

    expect(parsed).toEqual({ samples: [] }); // every() on nothing is true
  });

  it("reads a list of objects, an empty object included", () => {
    const parsed = parseSamples("[{\"Rarity\":\"Rare\"},{}]");

    expect(parsed).toEqual({ samples: [{ Rarity: "Rare" }, {}] }); // {} is a valid set
  });

  it("reports text that is not JSON under the label it was given", () => {
    const parsed = parseSamples("[", "Rejects");

    expect(parsed).toEqual({ problem: expect.stringMatching(/^Rejects is not JSON: .+/) }); // parser message appended
  });

  it("names the box Samples when no label is given", () => {
    const parsed = parseSamples("nope");

    expect(parsed).toEqual({ problem: expect.stringMatching(/^Samples is not JSON: /) }); // default label
  });

  it("refuses a single object that is not in a list", () => {
    const parsed = parseSamples("{}");

    expect(parsed).toEqual(NOT_A_LIST); // valid JSON, wrong shape
  });

  it("refuses a list holding null", () => {
    const parsed = parseSamples("[{}, null]");

    expect(parsed).toEqual(NOT_A_LIST); // typeof null is "object"
  });

  it("refuses a list holding a list", () => {
    const parsed = parseSamples("[[]]");

    expect(parsed).toEqual(NOT_A_LIST); // an array is typeof "object" too
  });

  it("refuses a list holding a number", () => {
    const parsed = parseSamples("[1]");

    expect(parsed).toEqual(NOT_A_LIST);
  });
});
