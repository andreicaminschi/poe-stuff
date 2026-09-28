import { describe, it, expect } from "@jest/globals";
import { formatCondition, formatNote } from "./format-note.ts";
import { parseFilter } from "./parse-filter.ts";

describe("formatNote", () => {
  it("writes the keys in one fixed order whatever order they were given in", () => {
    const note = formatNote({ family: "gems", verb: "check", upto: "T0", tier: "T2" });

    expect(note).toBe("#@ tier=T2 upto=T0 verb=check family=gems"); // APPLY_KEYS order
  });

  it("puts trimmed freehand text after the pairs, even when a later word holds an equals sign", () => {
    const note = formatNote({ tier: "T1", verb: "take" }, "  debug a=b  ");

    expect(note).toBe("#@ tier=T1 verb=take debug a=b"); // only the first word is checked
  });

  it("writes no freehand when it is only spaces", () => {
    const note = formatNote({ tier: "T1", verb: "take" }, "   ");

    expect(note).toBe("#@ tier=T1 verb=take"); // no trailing space
  });

  it("writes a line the parser reads back as the same pairs and freehand", () => {
    const note = formatNote({ tier: "want", verb: "gamble", family: "maps" }, "why this");

    const [block] = parseFilter(`Show\n${note}`);

    expect(block!.notes.map((n) => [n.key, n.value])).toEqual([
      ["tier", "want"],
      ["verb", "gamble"],
      ["family", "maps"],
    ]);
    expect(block!.freehand).toBe("why this"); // writer and reader agree
  });

  it("refuses a note with no tier", () => {
    const write = () => formatNote({ verb: "take" });

    expect(write).toThrow("cannot write a #@ note: a note needs tier and verb, and this one has no tier");
  });

  it("refuses a note with no verb", () => {
    const write = () => formatNote({ tier: "T1" });

    expect(write).toThrow("this one has no verb");
  });

  it("refuses a value the key does not allow and lists the ones it does", () => {
    const write = () => formatNote({ tier: "want", verb: "take", upto: "want" });

    expect(write).toThrow("upto takes one of T0, T1, T2, T3, T4, T5, T6, varies, hidden, got \"want\""); // "want" is a tier, not an upto
  });

  it("refuses freehand that runs over two lines", () => {
    const write = () => formatNote({ tier: "T1", verb: "take" }, "a\nb");

    expect(write).toThrow("freehand cannot span lines");
  });

  it("refuses freehand whose first word looks like a key and value", () => {
    const write = () => formatNote({ tier: "T1", verb: "take" }, "a=b c");

    expect(write).toThrow("freehand cannot start with \"a=b\""); // reader would take it for a pair
  });
});

describe("formatCondition", () => {
  it("trims the condition and writes it with no comment", () => {
    const line = formatCondition("  AreaLevel >= 68  ");

    expect(line).toBe("AreaLevel >= 68");
  });

  it("puts a trimmed comment after a hash", () => {
    const line = formatCondition("AreaLevel >= 68", " bucket x ");

    expect(line).toBe("AreaLevel >= 68 # bucket x");
  });

  it("writes no comment when it is only spaces", () => {
    const line = formatCondition("Quality > 5", "  ");

    expect(line).toBe("Quality > 5"); // no dangling "#"
  });

  it("refuses a condition that is only spaces", () => {
    const write = () => formatCondition("   ");

    expect(write).toThrow("cannot write a condition line: it is empty"); // checked after trim
  });

  it("refuses a condition that runs over two lines", () => {
    const write = () => formatCondition("a\nb");

    expect(write).toThrow("a condition is one line");
  });

  it("refuses a condition that is already a comment", () => {
    const write = () => formatCondition("# x");

    expect(write).toThrow("\"# x\" is already a comment");
  });

  it("refuses a hash anywhere in the condition, even inside quotes", () => {
    const write = () => formatCondition("BaseType \"A#B\"");

    expect(write).toThrow("has a # in it"); // the game ends the line at any #
  });

  it("refuses a comment that runs over two lines", () => {
    const write = () => formatCondition("Quality > 5", "a\nb");

    expect(write).toThrow("the comment is more than one line");
  });
});
