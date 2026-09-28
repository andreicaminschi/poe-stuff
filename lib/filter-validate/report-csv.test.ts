import { describe, it, expect } from "@jest/globals";
import { reportCsv } from "./report-csv.ts";
import type { UnfilteredReport, UnfilteredRow } from "./types.ts";

const report = (rows: readonly UnfilteredRow[]): UnfilteredReport => ({
  sampled: 0,
  unfiltered: 0,
  unsampled: [],
  rows,
});

describe("reportCsv", () => {
  it("writes only the header line for a report with no rows", () => {
    const csv = reportCsv(report([]));

    expect(csv).toBe("Category,Subcategory,Row,Key\r\n"); // CRLF, trailing newline
  });

  it("writes one line per sample, with property columns in the order first seen and an empty cell for a missing one", () => {
    const rows = [{ key: "k", name: "Orb", category: "currency", subcategory: null, samples: [{ StackSize: 1 }, { Quality: 5 }] }];

    const csv = reportCsv(report(rows));

    expect(csv).toBe("Category,Subcategory,Row,Key,StackSize,Quality\r\ncurrency,,Orb,k,1,\r\ncurrency,,Orb,k,,5\r\n");
  });

  it("writes the path with the most unfiltered samples first", () => {
    const rows = [
      { key: "a", name: "A", category: "x", subcategory: null, samples: [{}] },
      { key: "b", name: "B", category: "y", subcategory: null, samples: [{}, {}] },
    ];

    const csv = reportCsv(report(rows));

    expect(csv.split("\r\n").slice(1, 4).map((line) => line.split(",")[3])).toEqual(["b", "b", "a"]); // grouped, not input order
  });

  it("joins two influences with a space and writes an empty list as None", () => {
    const rows = [{ key: "k", name: "R", category: "c", subcategory: "s", samples: [{ HasInfluence: ["Shaper", "Elder"] }, { HasInfluence: [] }] }];

    const csv = reportCsv(report(rows));

    expect(csv.split("\r\n").slice(1, 3)).toEqual(["c,s,R,k,Shaper Elder", "c,s,R,k,None"]);
  });

  it("quotes a cell holding a comma or a quote, and doubles the quote", () => {
    const rows = [{ key: "k", name: "Say \"hi\", then", category: "c", subcategory: null, samples: [{}] }];

    const csv = reportCsv(report(rows));

    expect(csv.split("\r\n")[1]).toBe("c,,\"Say \"\"hi\"\", then\",k"); // RFC 4180 escaping
  });
});
