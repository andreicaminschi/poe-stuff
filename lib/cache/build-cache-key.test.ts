import { describe, it, expect } from "@jest/globals";
import { buildCacheKey } from "./build-cache-key.ts";

describe("buildCacheKey", () => {
  it("gives the same key for the same parts every time", () => {
    expect(buildCacheKey("ns", "a", "b")).toBe(buildCacheKey("ns", "a", "b"));
  });

  it("keeps the namespace readable in front of a sha256 hex digest", () => {
    expect(buildCacheKey("trade", "x")).toMatch(/^trade_[0-9a-f]{64}$/);
  });

  it("tells apart tuples that a plain join would merge", () => {
    expect(buildCacheKey("ns", "a:b", "c")).not.toBe(buildCacheKey("ns", "a", "b:c")); // length prefix
  });

  it("tells apart the same text split into different parts", () => {
    expect(buildCacheKey("ns", "ab")).not.toBe(buildCacheKey("ns", "a", "b"));
  });

  it("depends on the order of the parts", () => {
    expect(buildCacheKey("ns", "a", "b")).not.toBe(buildCacheKey("ns", "b", "a"));
  });

  it("gives different keys to one empty part and no parts at all", () => {
    expect(buildCacheKey("ns", "")).not.toBe(buildCacheKey("ns")); // "0:" vs ""
  });

  it("hashes no parts as the digest of the empty string", () => {
    expect(buildCacheKey("ns")).toBe(
      "ns_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("gives the same digest under different namespaces", () => {
    expect(buildCacheKey("a", "x").split("_")[1]).toBe(buildCacheKey("b", "x").split("_")[1]);
  });

  it("lets a namespace with an underscore collide with a shorter one", () => {
    expect(buildCacheKey("a_b")).toBe(`a_b_${buildCacheKey("x").split("_")[1]}`); // separator not escaped
  });
});
