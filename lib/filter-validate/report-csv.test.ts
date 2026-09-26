import { describe, it, expect } from "@jest/globals";
import { reportCsv } from "./report-csv.ts";
import type { UnfilteredReport, UnfilteredRow } from "./types.ts";

const report = (rows: readonly UnfilteredRow[]): UnfilteredReport => ({ sampled: 0, unfiltered: 0, unsampled: [], rows });

describe("reportCsv", () => {
  it("writes only the header for a report with no rows", () => {
    expect(reportCsv(report([]))).toBe("Category,Subcategory,Row,Key\r\n");
  });

  it("writes one line per sample with properties in the order first seen", () => {
    const csv = reportCsv(
      report([
        { key: "k", name: "Orb", category: "currency", subcategory: null, samples: [{ StackSize: 1 }, { Quality: 5 }] },
      ]),
    );

    expect(csv).toBe(
      "Category,Subcategory,Row,Key,StackSize,Quality\r\ncurrency,,Orb,k,1,\r\ncurrency,,Orb,k,,5\r\n",
    ); // missing property is an empty cell
  });

  it("joins lists with spaces and writes an empty list as None", () => {
    const csv = reportCsv(
      report([
        { key: "k", name: "R", category: "c", subcategory: "s", samples: [{ HasInfluence: ["Shaper", "Elder"] }, { HasInfluence: [] }] },
      ]),
    );

    expect(csv.split("\r\n").slice(1, 3)).toEqual(["c,s,R,k,Shaper Elder", "c,s,R,k,None"]);
  });

  it("quotes a cell holding a comma or a quote and doubles the quote", () => {
    const csv = reportCsv(
      report([{ key: "k", name: 'Say "hi", then', category: "c", subcategory: null, samples: [{}] }]),
    );

    expect(csv.split("\r\n")[1]).toBe('c,,"Say ""hi"", then",k');
  });
});
