import { describe, it, expect } from "@jest/globals";
import { splitSections } from "./sections.ts";

describe("splitSections", () => {
  it("cuts the text at every line of exactly eight hyphens", () => {
    expect(splitSections("a\n--------\nb\nc")).toEqual([["a"], ["b", "c"]]);
  });

  it("reads Windows and old Mac line endings the same as Unix ones", () => {
    expect(splitSections("a\r\n--------\rb")).toEqual([["a"], ["b"]]);
  });

  it("right-trims every line and drops blank ones", () => {
    expect(splitSections("  a  \n\n   \nb ")).toEqual([["  a", "b"]]);
  });

  it("accepts a separator with trailing spaces", () => {
    expect(splitSections("a\n-------- \nb")).toEqual([["a"], ["b"]]);
  });

  it("keeps a line of seven or nine hyphens as text", () => {
    expect(splitSections("-------\n---------")).toEqual([["-------", "---------"]]);
  });

  it("drops the empty section a doubled or leading separator would make", () => {
    expect(splitSections("--------\na\n--------\n--------\nb\n--------")).toEqual([["a"], ["b"]]);
  });

  it("returns no sections for empty text", () => {
    expect(splitSections("")).toEqual([]);
  });
});
