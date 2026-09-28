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
const skillAndSupport: SampleCategories = { "gems/skill": qualitySamples, "gems/support": { conditions: [] } };
const rejecting: SampleCategories = {
  "gems/skill": { conditions: [], samples: [{ Quality: { values: [20] } }], rejects: [{ Corrupted: { values: [true] } }] },
};

describe("findFallThrough", () => {
  describe("clean filters", () => {
    it("reports nothing when a path's own block takes both of its samples and asks about quality", () => {
      const blocks = filter(block("    Quality >= 0\n", "a"));

      const report = findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples });

      expect(report).toEqual({ sampled: 2, unfiltered: 0, ownMiss: [], fallThrough: [], overlap: [], rejected: [], blind: [] });
    });

    it("counts both samples as unfiltered, and as nothing else, against an empty filter", () => {
      const report = findFallThrough([], [row("a", "skill")], { "gems/skill": qualitySamples });

      expect([report.sampled, report.unfiltered, report.ownMiss]).toEqual([2, 2, []]); // unfiltered is its own bucket
    });
  });

  describe("blind winners", () => {
    it("calls the winning block blind when it never asks about quality, which the samples vary", () => {
      const blocks = filter(block("", "a"));

      const report = findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples });

      expect(report.blind).toEqual([
        { path: "gems/skill", property: "Quality", count: 2, example: { key: "a", variant: "", item: { Quality: 0 } } },
      ]); // first sample is the example
    });

    it("does not call a winner blind when each winning block asks about quality", () => {
      const blocks = filter(block("    Quality >= 20\n", "a"), block("    Quality < 20\n", "a"));

      const report = findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples });

      expect(report.blind).toEqual([]);
    });
  });

  describe("wrong owners", () => {
    it("reports an own miss when only another path's block takes the samples", () => {
      const blocks = filter(block("    Quality >= 0\n", "b"));

      const report = findFallThrough(blocks, [row("a", "skill"), row("b", "support")], skillAndSupport);

      expect(report.ownMiss).toEqual([
        { own: "gems/skill", other: "gems/support", count: 2, example: { ownKey: "a", otherKey: "b", item: { Quality: 0 } } },
      ]);
    });

    it("reports an own miss against an empty path when the winning block names no known row", () => {
      const blocks = filter(block("    Quality >= 0\n", "stranger"));

      const report = findFallThrough(blocks, [row("a", "skill")], { "gems/skill": qualitySamples });

      expect(report.ownMiss.map(({ own, other, count }) => [own, other, count])).toEqual([["gems/skill", "", 2]]); // "" means unowned
    });

    it("reports a fall-through when a path's own block matches but another path's block wins first", () => {
      const blocks = filter(block("    Quality >= 20\n", "b"), block("    Quality >= 0\n", "a"));

      const report = findFallThrough(blocks, [row("a", "skill"), row("b", "support")], skillAndSupport);

      expect(report.fallThrough.map(({ own, other, count }) => [own, other, count])).toEqual([["gems/skill", "gems/support", 1]]); // only the quality-20 sample
    });

    it("reports an overlap when a path's own block wins and another path's block also matches", () => {
      const blocks = filter(block("    Quality >= 0\n", "a"), block("    Quality >= 20\n", "b"));

      const report = findFallThrough(blocks, [row("a", "skill"), row("b", "support")], skillAndSupport);

      expect(report.overlap.map(({ own, other, count }) => [own, other, count])).toEqual([["gems/skill", "gems/support", 1]]);
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
      ]); // aura was sampled first but has fewer
    });
  });

  describe("catch-all paths", () => {
    it("lets a catch-all path in the same category overlap without a report", () => {
      const categories: SampleCategories = { "gems/skill": qualitySamples, "gems/other": { conditions: [], catchAll: true } };
      const blocks = filter(block("    Quality >= 0\n", "a"), block("    Quality >= 20\n", "b"));

      const report = findFallThrough(blocks, [row("a", "skill"), row("b", "other")], categories);

      expect(report.overlap).toEqual([]); // a fallback may overlap its siblings
    });

    it("does not judge a catch-all path's own samples", () => {
      const categories: SampleCategories = { "gems/other": { ...qualitySamples, catchAll: true } };

      const report = findFallThrough([], [row("a", "other")], categories);

      expect(report.sampled).toBe(0); // it exists to take what others miss
    });
  });

  describe("reject samples", () => {
    it("reports a reject sample its own path takes, naming the variant, and does not count it as sampled", () => {
      const blocks = filter(block("    Quality >= 20\n", "a level"));

      const report = findFallThrough(blocks, [row("a", "skill")], rejecting);

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
      ]); // variant read off the block's owner note
    });

    it("does not report a reject sample its own path leaves alone", () => {
      const blocks = filter(block("    Corrupted False\n    Quality >= 20\n", "a"));

      const report = findFallThrough(blocks, [row("a", "skill")], rejecting);

      expect(report.rejected).toEqual([]);
    });
  });
});
