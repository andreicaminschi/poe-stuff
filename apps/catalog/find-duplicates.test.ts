import { describe, expect, it } from "@jest/globals";
import type { Item } from "./item.ts";
import { findDuplicates, knownDuplicates } from "./find-duplicates.ts";

const row = (key: string, name: string, category = "c"): Item => ({
  key,
  name,
  category,
  subcategory: null,
  baseTypes: [name],
});

describe("findDuplicates", () => {
  it("counts rows and distinct names and finds nothing when every name is unique", () => {
    expect(findDuplicates("r", [row("a", "A"), row("b", "B")], [])).toEqual({
      runId: "r",
      rows: 2,
      names: 2,
      duplicates: [],
      known: [],
    });
  });

  it("reports a shared name with its ids and categories sorted and deduplicated", () => {
    const report = findDuplicates("r", [row("z", "N", "y"), row("a", "N", "x"), row("m", "N", "x")], []);

    expect(report.duplicates).toEqual([{ name: "N", ids: ["a", "m", "z"], categories: ["x", "y"] }]);
  });

  it("reports the same id twice under one name as a clash with one id", () => {
    expect(findDuplicates("r", [row("a", "N"), row("a", "N")], []).duplicates).toEqual([
      { name: "N", ids: ["a"], categories: ["c"] },
    ]);
  });

  it("orders clashes by most ids first, then by name", () => {
    const rows = [
      row("1", "B"),
      row("2", "B"),
      row("3", "A"),
      row("4", "A"),
      row("5", "C"),
      row("6", "C"),
      row("7", "C"),
    ];

    expect(findDuplicates("r", rows, []).duplicates.map((clash) => clash.name)).toEqual(["C", "A", "B"]);
  });

  it("settles a clash whose every id is recorded, carrying the reason", () => {
    const report = findDuplicates(
      "r",
      [row("a", "N"), row("b", "N")],
      [{ name: "N", ids: ["a", "b", "old"], reason: "why" }],
    );

    expect([report.duplicates, report.known]).toEqual([
      [],
      [{ name: "N", ids: ["a", "b"], categories: ["c"], reason: "why" }],
    ]);
  });

  it("reopens a known clash when a new id appears under the name", () => {
    const report = findDuplicates(
      "r",
      [row("a", "N"), row("b", "N"), row("c", "N")],
      [{ name: "N", ids: ["a", "b"], reason: "why" }],
    );

    expect([report.duplicates.map((clash) => clash.ids), report.known]).toEqual([[["a", "b", "c"]], []]);
  });
});

describe("knownDuplicates", () => {
  it("reads the hand-kept file as a list with a reason on every entry", () => {
    expect(knownDuplicates().every((entry) => typeof entry.reason === "string" && entry.ids.length > 0)).toBe(true);
  });
});
