import { describe, it, expect } from "@jest/globals";
import { parseRetryAfter, parseRules, parseState } from "./parse-rate-limit-headers.ts";

describe("parseRules", () => {
  it("allows 44 of 45 requests and holds a 60-second window open for 61 seconds", () => {
    const rules = parseRules("45:60:120,240:240:900");

    expect(rules).toEqual([
      { max: 44, windowMs: 61_000 },
      { max: 239, windowMs: 241_000 },
    ]);
  }); // one slot of headroom, one second of skew

  it("still allows one request when the server allows exactly one", () => {
    const rules = parseRules("1:5:10");

    expect(rules).toEqual([{ max: 1, windowMs: 6_000 }]);
  }); // headroom never drops a rule to zero

  it("reads a missing header as no rules", () => {
    const rules = parseRules(null);

    expect(rules).toEqual([]);
  }); // null header

  it("reads an empty header as no rules", () => {
    const rules = parseRules("");

    expect(rules).toEqual([]);
  }); // "" would otherwise split into one empty part

  it("drops a two-field triple and a non-numeric triple but keeps the good one after them", () => {
    const rules = parseRules("10:5,x:5:10,20:10:60");

    expect(rules).toEqual([{ max: 19, windowMs: 11_000 }]);
  }); // bad parts are skipped, not fatal

  it("drops a triple with an empty field rather than read it as zero", () => {
    const rules = parseRules(":5:10");

    expect(rules).toEqual([]);
  }); // Number("") is 0
});

describe("parseState", () => {
  it("reads hits, window and restriction in that order for each triple", () => {
    const state = parseState("3:12:0,143:21600:60");

    expect(state).toEqual([
      { hits: 3, windowSeconds: 12, restrictedSeconds: 0 },
      { hits: 143, windowSeconds: 21600, restrictedSeconds: 60 },
    ]);
  }); // no headroom or skew applied here

  it("reads a missing header as no state", () => {
    const state = parseState(null);

    expect(state).toEqual([]);
  }); // null header
});

describe("parseRetryAfter", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("reads 30 as thirty seconds", () => {
    const seconds = parseRetryAfter("30", now);

    expect(seconds).toBe(30);
  }); // numeric form

  it("reads a negative count as no wait", () => {
    const seconds = parseRetryAfter("-5", now);

    expect(seconds).toBe(0);
  }); // clamped at zero

  it("reads a missing header as no duration given", () => {
    const seconds = parseRetryAfter(null, now);

    expect(seconds).toBeUndefined();
  }); // undefined, not zero

  it("reads a whitespace-only header as no duration given", () => {
    const seconds = parseRetryAfter(" ", now);

    expect(seconds).toBeUndefined();
  }); // Number(" ") is 0, so trimmed first

  it("turns an HTTP date a second and a millisecond away into two whole seconds", () => {
    const at = new Date(now + 1_500).toUTCString();

    const seconds = parseRetryAfter(at, now - 1);

    expect(seconds).toBe(2);
  }); // toUTCString drops ms; rounds up, never early

  it("reads a date a minute in the past as no wait", () => {
    const seconds = parseRetryAfter(new Date(now - 60_000).toUTCString(), now);

    expect(seconds).toBe(0);
  }); // clamped at zero

  it("reads a word that is neither a number nor a date as no duration given", () => {
    const seconds = parseRetryAfter("soon", now);

    expect(seconds).toBeUndefined();
  }); // Date.parse NaN
});
