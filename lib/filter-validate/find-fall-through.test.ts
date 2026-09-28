import { describe, it, expect } from "@jest/globals";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { findFallThrough } from "./find-fall-through.ts";
import type { SampleCategories, SampleRow } from "./types.ts";

const row = (key: string, subcategory: string): SampleRow => ({
  key,
  name: key,
  category: "gems",
  subcategory,
  baseTypes: [],
});

const block = (conditions: string, owner: string) => `Show\n${conditions}    #@ tier=T1 verb=take ${owner}\n`;
const filter = (...blocks: string[]) => parseFilter(blocks.join("\n"));

const qualitySamples = { conditions: [], samples: [{ Quality: { values: [0, 20] } }] };

describe("findFallThrough", () => {
  it("reports nothing when each path cleanly takes its own samples", () => {
    const blocks = filter(block("    Quality >= 0\n", "a"));

    expect(findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples })).toEqual({
      sampled: 2,
      unfiltered: 0,
      ownMiss: [],
      fallThrough: [],
      overlap: [],
      rejected: [],
      blind: [],
    });
  });

  it("calls a winning block blind when it never asks about a property the samples vary", () => {
    const blocks = filter(block("", "a"));

    expect(findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples }).blind).toEqual([
      { path: "gems/skill", property: "Quality", count: 2, example: { key: "a", variant: "", item: { Quality: 0 } } },
    ]);
  });

  it("counts a sample no block takes as unfiltered and nothing else", () => {
    const report = findFallThrough([], [row("a", "skill")], { "gems/skill": qualitySamples });

    expect([report.sampled, report.unfiltered, report.ownMiss]).toEqual([2, 2, []]);
  });

  it("reports an own miss when only another path's row matches", () => {
    const categories: SampleCategories = { "gems/skill": qualitySamples, "gems/support": { conditions: [] } };
    const blocks = filter(block("    Quality >= 0\n", "b"));

    const report = findFallThrough(blocks, [row("a", "skill"), row("b", "support")], categories);

    expect(report.ownMiss).toEqual([
      {
        own: "gems/skill",
        other: "gems/support",
        count: 2,
        example: { ownKey: "a", otherKey: "b", item: { Quality: 0 } },
      },
    ]);
  });

  it("reports an own miss with an empty other path when the winner names no known row", () => {
    const blocks = filter(block("    Quality >= 0\n", "stranger"));

    const report = findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples });

    expect(report.ownMiss.map(({ own, other, count }) => [own, other, count])).toEqual([["gems/skill", "", 2]]);
  });

  it("reports a fall-through when its own path matches but another path wins first", () => {
    const categories: SampleCategories = { "gems/skill": qualitySamples, "gems/support": { conditions: [] } };
    const blocks = filter(block("    Quality >= 20\n", "b"), block("    Quality >= 0\n", "a"));

    const report = findFallThrough(blocks, [row("a", "skill"), row("b", "support")], categories);

    expect(report.fallThrough.map(({ own, other, count }) => [own, other, count])).toEqual([
      ["gems/skill", "gems/support", 1],
    ]);
  });

  it("reports an overlap when its own path wins and another path also matches", () => {
    const categories: SampleCategories = { "gems/skill": qualitySamples, "gems/support": { conditions: [] } };
    const blocks = filter(block("    Quality >= 0\n", "a"), block("    Quality >= 20\n", "b"));

    const report = findFallThrough(blocks, [row("a", "skill"), row("b", "support")], categories);

    expect(report.overlap.map(({ own, other, count }) => [own, other, count])).toEqual([
      ["gems/skill", "gems/support", 1],
    ]);
  });

  it("lets a catch-all path in the same category overlap without a report", () => {
    const categories: SampleCategories = {
      "gems/skill": qualitySamples,
      "gems/other": { conditions: [], catchAll: true },
    };
    const blocks = filter(block("    Quality >= 0\n", "a"), block("    Quality >= 20\n", "b"));

    const report = findFallThrough(blocks, [row("a", "skill"), row("b", "other")], categories);

    expect(report.overlap).toEqual([]);
  });

  it("does not judge a catch-all path's own samples", () => {
    const categories: SampleCategories = { "gems/other": { ...qualitySamples, catchAll: true } };

    expect(findFallThrough([], [row("a", "other")], categories).sampled).toBe(0);
  });

  it("reports a reject sample its own path takes, and does not count it as sampled", () => {
    const categories: SampleCategories = {
      "gems/skill": {
        conditions: [],
        samples: [{ Quality: { values: [20] } }],
        rejects: [{ Corrupted: { values: [true] } }],
      },
    };
    const blocks = filter(block("    Quality >= 20\n", "a level"));

    const report = findFallThrough(blocks, [row("a", "skill")], categories);

    expect([report.sampled, report.rejected]).toEqual([
      1,
      [
        {
          path: "gems/skill",
          reject: "{\"Corrupted\":true}",
          count: 1,
          example: { key: "a", variant: "level", item: { Quality: 20, Corrupted: true } },
        },
      ],
    ]);
  });

  it("does not report a reject sample that its own path leaves alone", () => {
    const categories: SampleCategories = {
      "gems/skill": {
        conditions: [],
        samples: [{ Quality: { values: [20] } }],
        rejects: [{ Corrupted: { values: [true] } }],
      },
    };
    const blocks = filter(block("    Corrupted False\n    Quality >= 20\n", "a"));

    expect(findFallThrough(blocks, [row("a", "skill")], categories).rejected).toEqual([]);
  });

  it("does not call a winner blind when it asks about the varied property", () => {
    const blocks = filter(block("    Quality >= 20\n", "a"), block("    Quality < 20\n", "a"));

    expect(findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples }).blind).toEqual([]);
  });

  it("puts the path pair with the most samples first", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ Quality: { values: [0, 20] } }] },
      "gems/aura": { conditions: [], samples: [{ Quality: { values: [1] } }] },
      "gems/support": { conditions: [] },
    };
    const blocks = filter(block("    Quality >= 0\n", "c"));

    const report = findFallThrough(blocks, [row("b", "aura"), row("a", "skill"), row("c", "support")], categories);

    expect(report.ownMiss.map(({ own, count }) => [own, count])).toEqual([
      ["gems/skill", 2],
      ["gems/aura", 1],
    ]);
  });
});
