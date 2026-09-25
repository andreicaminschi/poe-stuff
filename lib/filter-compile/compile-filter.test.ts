import { describe, it, expect } from "@jest/globals";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { compileFilter, type CompileRow } from "./compile-filter.ts";

const row = (key: string, name: string, category: string, extra: Partial<CompileRow> = {}): CompileRow => ({
  key,
  name,
  category,
  subcategory: null,
  baseTypes: [name],
  ...extra,
});

const categories = {
  currency: { conditions: [{ condition: "BaseType", operator: "==", from: "name" }] },
  gem: {
    conditions: [
      { condition: "Class", operator: "==", value: ["Skill Gems"] },
      { condition: "BaseType", operator: "==", from: "baseTypes" },
    ],
  },
  map: { conditions: [{ condition: "BaseType", operator: "==", from: "name" }] },
  "map/blighted": {
    conditions: [
      { condition: "BlightedMap", value: true },
      { condition: "BaseType", operator: "==", value: null },
    ],
  },
};

describe("compileFilter", () => {
  it("writes one Show block per row with its resolved conditions and a note", () => {
    const compiled = compileFilter([row("Metadata/Chaos", "Chaos Orb", "currency")], categories);

    expect(compiled.text).toBe(
      ['Show', '  BaseType == "Chaos Orb"', "  #@ tier=varies verb=check Metadata/Chaos", ""].join("\n"),
    );
    expect(compiled.blocks).toBe(1);
    expect(compiled.skipped).toEqual([]);
  });

  it("fills from:baseTypes off an authored row's base type", () => {
    const compiled = compileFilter(
      [row("authored/inspiring", "Absolution of Inspiring", "gem", { baseTypes: ["Absolution"] })],
      categories,
    );

    expect(compiled.text).toContain('  Class == "Skill Gems"\n  BaseType == "Absolution"\n');
  });

  it("lays a subcategory over its category", () => {
    const compiled = compileFilter(
      [row("Metadata/Blight", "Blighted Map", "map", { subcategory: "blighted" })],
      categories,
    );

    expect(compiled.text).toContain("  BlightedMap True\n");
    expect(compiled.text).not.toContain("BaseType");
  });

  it("writes a block per variant, and none for the row itself", () => {
    const compiled = compileFilter(
      [
        row("Metadata/Empower", "Empower Support", "gem", {
          variants: [
            { name: "level 3", conditions: [{ condition: "GemLevel", operator: ">=", value: 3 }] },
            { name: "level 4", conditions: [{ condition: "GemLevel", operator: ">=", value: 4 }] },
          ],
        }),
      ],
      categories,
    );

    expect(compiled.blocks).toBe(2);
    expect(compiled.text).toContain("GemLevel >= 3");
    expect(compiled.text).toContain("#@ tier=varies verb=check Metadata/Empower level 4");
  });

  it("skips, and says why, what it cannot write", () => {
    const compiled = compileFilter(
      [
        row("Metadata/Lost", "Lost", "nowhere"),
        row("Metadata/Quote", 'A "B"', "currency"),
        row("Metadata/Fine", "Fine Orb", "currency"),
      ],
      categories,
    );

    expect(compiled.blocks).toBe(1);
    expect(compiled.skipped).toEqual([
      { key: "Metadata/Lost", problem: "has no conditions yet" },
      { key: "Metadata/Quote", problem: "has a quote in its name, which a .filter line cannot hold" },
    ]);
  });

  it("draws a row off its own condition when its category has no record", () => {
    const compiled = compileFilter(
      [
        row("Metadata/Lone", "Lone Orb", "StackableCurrency", {
          conditions: [{ condition: "BaseType", operator: "==", from: "name" }],
        }),
      ],
      categories,
    );

    expect(compiled.blocks).toBe(1);
    expect(compiled.text).toContain('  BaseType == "Lone Orb"\n');
  });

  it("produces text the parser reads back block for block", () => {
    const compiled = compileFilter(
      [row("Metadata/Chaos", "Chaos Orb", "currency"), row("Metadata/Divine", "Divine Orb", "currency")],
      categories,
    );

    expect(parseFilter(compiled.text)).toHaveLength(2);
  });
});
