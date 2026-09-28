import { describe, it, expect } from "@jest/globals";
import { buildCacheKey } from "./build-cache-key.ts";

describe("buildCacheKey", () => {
  it("gives the same key for the same parts every time", () => {
    const first = buildCacheKey("ns", "a", "b");

    const second = buildCacheKey("ns", "a", "b");

    expect(second).toBe(first); // no salt, no clock
  });

  it("keeps the namespace readable in front of a 64-character hex digest", () => {
    const key = buildCacheKey("trade", "x");

    expect(key).toMatch(/^trade_[0-9a-f]{64}$/); // filename-safe by construction
  });

  it("tells apart two tuples that a plain join would turn into the same text", () => {
    const left = buildCacheKey("ns", "a:b", "c");

    const right = buildCacheKey("ns", "a", "b:c");

    expect(left).not.toBe(right); // length prefix, not a separator
  });

  it("tells apart the same text split into one part or two", () => {
    const whole = buildCacheKey("ns", "ab");

    const split = buildCacheKey("ns", "a", "b");

    expect(whole).not.toBe(split); // "2:ab" vs "1:a1:b"
  });

  it("gives a different key when the parts are swapped", () => {
    const ab = buildCacheKey("ns", "a", "b");

    const ba = buildCacheKey("ns", "b", "a");

    expect(ab).not.toBe(ba); // order is part of the identity
  });

  it("gives different keys to one empty part and to no parts at all", () => {
    const oneEmpty = buildCacheKey("ns", "");

    const none = buildCacheKey("ns");

    expect(oneEmpty).not.toBe(none); // "0:" vs ""
  });

  it("hashes no parts as the digest of the empty string", () => {
    const key = buildCacheKey("ns");

    expect(key).toBe("ns_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"); // sha256("")
  });

  it("gives the same digest under two different namespaces", () => {
    const a = buildCacheKey("a", "x");

    const b = buildCacheKey("b", "x");

    expect(a.split("_")[1]).toBe(b.split("_")[1]); // namespace is not hashed
  });

  it("lets a namespace containing an underscore look like a shorter namespace plus a part", () => {
    const digestOfNothing = buildCacheKey("x").split("_")[1];

    const key = buildCacheKey("a_b");

    expect(key).toBe(`a_b_${digestOfNothing}`); // separator is not escaped
  });
});
