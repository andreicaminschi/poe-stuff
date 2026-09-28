import { describe, it, expect } from "@jest/globals";
import { modMatcher, resolveItem } from "./resolve-item.ts";
import { parseItem } from "./parse-item.ts";

const matcher = modMatcher([{ id: "explicit.life", text: "+# to maximum Life", type: "explicit" }]);

describe("resolveItem", () => {
  it("keeps a modifier that matched nothing on the item and lists its lines, joined, as unmatched", () => {
    const item = parseItem("X\n--------\n{ Prefix Modifier }\n+5 to maximum Life\n{ Suffix Modifier }\nfoo\nbar");

    const resolved = resolveItem(item, matcher);

    expect([resolved.mods.map((mod) => mod.stats.length), resolved.unmatched]).toEqual([[1, 0], ["foo\nbar"]]); // one entry per mod, not per line
  });

  it("leaves everything but the modifiers as the parser read it", () => {
    const item = parseItem("Item Class: Rings\nX");

    const resolved = resolveItem(item, matcher);

    expect(resolved).toEqual({ ...item, mods: [], unmatched: [] });
  });
});
