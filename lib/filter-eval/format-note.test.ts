import { describe, it, expect } from "@jest/globals";
import { formatCondition, formatNote } from "./format-note.ts";
import { parseFilter } from "./parse-filter.ts";

describe("formatNote", () => {
  it("writes keys in declared order whatever order they were given in", () => {
    expect(formatNote({ family: "gems", verb: "check", upto: "T0", tier: "T2" })).toBe("#@ tier=T2 upto=T0 verb=check family=gems");
  });

  it("appends trimmed freehand text after the pairs", () => {
    expect(formatNote({ tier: "T1", verb: "take" }, "  debug a=b  ")).toBe("#@ tier=T1 verb=take debug a=b");
  });

  it("treats whitespace-only freehand as none", () => {
    expect(formatNote({ tier: "T1", verb: "take" }, "   ")).toBe("#@ tier=T1 verb=take");
  });

  it("writes a line the parser reads back unchanged", () => {
    const note = formatNote({ tier: "want", verb: "gamble", family: "maps" }, "why this");

    const [block] = parseFilter(`Show\n${note}`);

    expect(block!.notes.map((n) => [n.key, n.value])).toEqual([["tier", "want"], ["verb", "gamble"], ["family", "maps"]]);
    expect(block!.freehand).toBe("why this");
  });

  it("refuses notes without a tier", () => {
    expect(() => formatNote({ verb: "take" })).toThrow("cannot write a #@ note: a note needs tier and verb, and this one has no tier");
  });

  it("refuses notes without a verb", () => {
    expect(() => formatNote({ tier: "T1" })).toThrow("this one has no verb");
  });

  it("refuses a value outside the key's list", () => {
    expect(() => formatNote({ tier: "want", verb: "take", upto: "want" })).toThrow('upto takes one of T0, T1, T2, T3, T4, T5, T6, varies, hidden, got "want"');
  });

  it("refuses freehand that spans lines", () => {
    expect(() => formatNote({ tier: "T1", verb: "take" }, "a\nb")).toThrow("freehand cannot span lines");
  });

  it("refuses freehand whose first word looks like a pair", () => {
    expect(() => formatNote({ tier: "T1", verb: "take" }, "a=b c")).toThrow('freehand cannot start with "a=b"');
  });
});

describe("formatCondition", () => {
  it("writes a trimmed condition with no comment", () => {
    expect(formatCondition("  AreaLevel >= 68  ")).toBe("AreaLevel >= 68");
  });

  it("appends a trimmed comment after a hash", () => {
    expect(formatCondition("AreaLevel >= 68", " bucket x ")).toBe("AreaLevel >= 68 # bucket x");
  });

  it("drops a whitespace-only comment", () => {
    expect(formatCondition("Quality > 5", "  ")).toBe("Quality > 5");
  });

  it("refuses an empty condition", () => {
    expect(() => formatCondition("   ")).toThrow("cannot write a condition line: it is empty");
  });

  it("refuses a condition over two lines", () => {
    expect(() => formatCondition("a\nb")).toThrow("a condition is one line");
  });

  it("refuses a condition that is already a comment", () => {
    expect(() => formatCondition("# x")).toThrow('"# x" is already a comment');
  });

  it("refuses a hash anywhere in the condition, even inside quotes", () => {
    expect(() => formatCondition('BaseType "A#B"')).toThrow("has a # in it");
  });

  it("refuses a comment over two lines", () => {
    expect(() => formatCondition("Quality > 5", "a\nb")).toThrow("the comment is more than one line");
  });
});
