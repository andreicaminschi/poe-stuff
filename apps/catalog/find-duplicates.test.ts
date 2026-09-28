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
  it("counts two rows and two names and finds nothing when every name is unique", () => {
    const report = findDuplicates("r", [row("a", "A"), row("b", "B")], []);

    expect(report).toEqual({ runId: "r", rows: 2, names: 2, duplicates: [], known: [] });
  }); // a lone name is never a clash

  it("reports a name three ids share, with the ids and categories sorted and deduplicated", () => {
    const report = findDuplicates("r", [row("z", "N", "y"), row("a", "N", "x"), row("m", "N", "x")], []);

    expect(report.duplicates).toEqual([{ name: "N", ids: ["a", "m", "z"], categories: ["x", "y"] }]);
  }); // category x appears twice but is listed once

  it("reports the same id twice under one name as a clash with one id", () => {
    const report = findDuplicates("r", [row("a", "N"), row("a", "N")], []);

    expect(report.duplicates).toEqual([{ name: "N", ids: ["a"], categories: ["c"] }]);
  }); // the clash test counts rows, the listing dedupes ids

  it("puts the name with three ids first, then the two-id names alphabetically", () => {
    const rows = [row("1", "B"), row("2", "B"), row("3", "A"), row("4", "A"), row("5", "C"), row("6", "C"), row("7", "C")];

    const report = findDuplicates("r", rows, []);

    expect(report.duplicates.map((clash) => clash.name)).toEqual(["C", "A", "B"]);
  }); // biggest clash first, name breaks ties

  it("settles a clash whose every id is recorded and carries the recorded reason", () => {
    const report = findDuplicates("r", [row("a", "N"), row("b", "N")], [{ name: "N", ids: ["a", "b", "old"], reason: "why" }]);

    expect([report.duplicates, report.known]).toEqual([[], [{ name: "N", ids: ["a", "b"], categories: ["c"], reason: "why" }]]);
  }); // the record may list ids that no longer exist

  it("reopens a known clash with all three ids when a third id appears under the name", () => {
    const report = findDuplicates("r", [row("a", "N"), row("b", "N"), row("c", "N")], [{ name: "N", ids: ["a", "b"], reason: "why" }]);

    expect([report.duplicates.map((clash) => clash.ids), report.known]).toEqual([[["a", "b", "c"]], []]);
  }); // known only when every id is covered
});

describe("knownDuplicates", () => {
  it("reads the hand-kept file with at least one id and a reason on every entry", () => {
    const known = knownDuplicates();

    expect(known.filter((entry) => typeof entry.reason !== "string" || entry.ids.length === 0)).toEqual([]);
  }); // the file is edited by hand with jq, so nothing else checks it
});
