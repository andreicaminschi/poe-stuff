import { describe, it, expect } from "@jest/globals";
import { cacheKey } from "./cache-key.ts";

describe("cacheKey", () => {
  it("gives the same key every time it is called with the same parts", () => {
    const first = cacheKey("search", "Rise of the Abyssal", "chaos orb");
    const second = cacheKey("search", "Rise of the Abyssal", "chaos orb");

    expect(first).toBe(second);
  });

  it("gives different keys to tuples a plain join would flatten together", () => {
    const split = cacheKey("search", "a:b", "c");
    const shifted = cacheKey("search", "a", "b:c");

    expect(split).not.toBe(shifted);
  });

  it("gives different keys to the same parts in a different order", () => {
    const forwards = cacheKey("search", "a", "b");
    const backwards = cacheKey("search", "b", "a");

    expect(forwards).not.toBe(backwards);
  });

  it("gives different keys to identical parts under different namespaces", () => {
    const search = cacheKey("search", "a");
    const pages = cacheKey("pages", "a");

    expect(search).not.toBe(pages);
  });

  it("treats an empty part as a part rather than dropping it", () => {
    const keys = new Set([
      cacheKey("search", "", "a"),
      cacheKey("search", "a"),
      cacheKey("search", "a", ""),
    ]);

    expect(keys.size).toBe(3);
  });

  it("returns the same length key for a one-character part and a long one", () => {
    const short = cacheKey("search", "a");
    const long = cacheKey("search", "a".repeat(10_000));

    expect(long).toHaveLength(short.length);
  });

  it("works with a namespace and no parts at all", () => {
    expect(cacheKey("search")).toMatch(/^search_[0-9a-f]{64}$/);
  });
});
