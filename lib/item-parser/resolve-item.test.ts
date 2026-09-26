import { describe, it, expect } from "@jest/globals";
import { modMatcher, resolveItem } from "./resolve-item.ts";
import { parseItem } from "./parse-item.ts";

const matcher = modMatcher([{ id: "explicit.life", text: "+# to maximum Life", type: "explicit" }]);

describe("resolveItem", () => {
  it("lists the joined text of every modifier that matched nothing", () => {
    const item = parseItem(
      "X\n--------\n{ Prefix Modifier }\n+5 to maximum Life\n{ Suffix Modifier }\nfoo\nbar",
    );

    const resolved = resolveItem(item, matcher);

    expect([resolved.mods.map((mod) => mod.stats.length), resolved.unmatched]).toEqual([[1, 0], ["foo\nbar"]]);
  });

  it("keeps the rest of the parsed item untouched", () => {
    const item = parseItem("Item Class: Rings\nX");

    expect(resolveItem(item, matcher)).toEqual({ ...item, mods: [], unmatched: [] });
  });
});
