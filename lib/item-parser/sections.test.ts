import { describe, it, expect } from "@jest/globals";
import { splitSections } from "./sections.ts";

describe("splitSections", () => {
  it("cuts the text at every line of exactly eight hyphens", () => {
    const sections = splitSections("a\n--------\nb\nc");

    expect(sections).toEqual([["a"], ["b", "c"]]);
  });

  it("reads Windows and old Mac line endings the same as Unix ones", () => {
    const sections = splitSections("a\r\n--------\rb");

    expect(sections).toEqual([["a"], ["b"]]); // lone \r too
  });

  it("trims spaces off the end of every line, keeps leading ones, and drops blank lines", () => {
    const sections = splitSections("  a  \n\n   \nb ");

    expect(sections).toEqual([["  a", "b"]]); // right-trim only
  });

  it("accepts a separator the game printed with a trailing space", () => {
    const sections = splitSections("a\n-------- \nb");

    expect(sections).toEqual([["a"], ["b"]]);
  });

  it("keeps a line of seven or of nine hyphens as text", () => {
    const sections = splitSections("-------\n---------");

    expect(sections).toEqual([["-------", "---------"]]); // exact match, not startsWith
  });

  it("makes no empty section from a leading, doubled or trailing separator", () => {
    const sections = splitSections("--------\na\n--------\n--------\nb\n--------");

    expect(sections).toEqual([["a"], ["b"]]);
  });

  it("gives no sections for empty text", () => {
    const sections = splitSections("");

    expect(sections).toEqual([]);
  });
});
