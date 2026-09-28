import { describe, it, expect } from "@jest/globals";
import { parseRetryAfter, parseRules, parseState } from "./parse-rate-limit-headers.ts";

describe("parseRules", () => {
  it("keeps one slot of headroom and widens each window by a second", () => {
    expect(parseRules("45:60:120,240:240:900")).toEqual([
      { max: 44, windowMs: 61_000 },
      { max: 239, windowMs: 241_000 },
    ]);
  });

  it("never lowers an allowance of one request below one", () => {
    expect(parseRules("1:5:10")).toEqual([{ max: 1, windowMs: 6_000 }]);
  });

  it("reads a missing or empty header as no rules", () => {
    expect(parseRules(null)).toEqual([]);
    expect(parseRules("")).toEqual([]);
  });

  it("drops a short triple and a non-numeric triple but keeps the good ones", () => {
    expect(parseRules("10:5,x:5:10,20:10:60")).toEqual([{ max: 19, windowMs: 11_000 }]);
  });

  it("drops a triple with an empty field", () => {
    expect(parseRules(":5:10")).toEqual([]);
  });
});

describe("parseState", () => {
  it("reads hits, window and restriction in order", () => {
    expect(parseState("3:12:0,143:21600:60")).toEqual([
      { hits: 3, windowSeconds: 12, restrictedSeconds: 0 },
      { hits: 143, windowSeconds: 21600, restrictedSeconds: 60 },
    ]);
  });

  it("reads a missing header as no state", () => {
    expect(parseState(null)).toEqual([]);
  });
});

describe("parseRetryAfter", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("reads a count of seconds", () => {
    expect(parseRetryAfter("30", now)).toBe(30);
  });

  it("clamps a negative count to zero", () => {
    expect(parseRetryAfter("-5", now)).toBe(0);
  });

  it("reads a missing or empty header as no duration", () => {
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter("", now)).toBeUndefined();
  });

  it("turns an HTTP date into whole seconds from now, rounded up", () => {
    const at = new Date(now + 1_500).toUTCString();

    // toUTCString drops ms, so the date is now+1s
    expect(parseRetryAfter(at, now - 1)).toBe(2);
  });

  it("reads a date already in the past as no wait", () => {
    expect(parseRetryAfter(new Date(now - 60_000).toUTCString(), now)).toBe(0);
  });

  it("reads garbage as no duration", () => {
    expect(parseRetryAfter("soon", now)).toBeUndefined();
  });

  it("reads a whitespace-only header as no duration", () => {
    expect(parseRetryAfter(" ", now)).toBeUndefined();
  });
});
