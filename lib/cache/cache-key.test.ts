import { describe, it, expect } from "@jest/globals";
import { cacheKey } from "./cache-key.ts";

describe("cacheKey", () => {
  it("gives the same key for the same parts every time", () => {
    expect(cacheKey("ns", "a", "b")).toBe(cacheKey("ns", "a", "b"));
  });

  it("keeps the namespace readable in front of a sha256 hex digest", () => {
    expect(cacheKey("trade", "x")).toMatch(/^trade_[0-9a-f]{64}$/);
  });

  it("tells apart tuples that a plain join would merge", () => {
    expect(cacheKey("ns", "a:b", "c")).not.toBe(cacheKey("ns", "a", "b:c")); // length prefix
  });

  it("tells apart the same text split into different parts", () => {
    expect(cacheKey("ns", "ab")).not.toBe(cacheKey("ns", "a", "b"));
  });

  it("depends on the order of the parts", () => {
    expect(cacheKey("ns", "a", "b")).not.toBe(cacheKey("ns", "b", "a"));
  });

  it("gives different keys to one empty part and no parts at all", () => {
    expect(cacheKey("ns", "")).not.toBe(cacheKey("ns")); // "0:" vs ""
  });

  it("hashes no parts as the digest of the empty string", () => {
    expect(cacheKey("ns")).toBe(
      "ns_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("gives the same digest under different namespaces", () => {
    expect(cacheKey("a", "x").split("_")[1]).toBe(cacheKey("b", "x").split("_")[1]);
  });

  it("lets a namespace with an underscore collide with a shorter one", () => {
    expect(cacheKey("a_b")).toBe(`a_b_${cacheKey("x").split("_")[1]}`); // separator not escaped
  });
});
