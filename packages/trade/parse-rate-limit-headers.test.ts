import { describe, it, expect } from "@jest/globals";
import { parseRules, parseState } from "./parse-rate-limit-headers.ts";

describe("parseRules", () => {
  it("turns the server's five-per-ten-seconds tier into a rule of four", () => {
    const rules = parseRules("5:10:60");

    expect(rules).toEqual([{ max: 4, windowMs: 10_000 }]);
  });

  it("reads every tier out of a comma-separated header", () => {
    const rules = parseRules("5:10:60,15:60:300,30:300:1800,600:21600:3600");

    expect(rules).toEqual([
      { max: 4, windowMs: 10_000 },
      { max: 14, windowMs: 60_000 },
      { max: 29, windowMs: 300_000 },
      { max: 599, windowMs: 21_600_000 },
    ]);
  });

  it("still allows one request when the server's tier only allows one", () => {
    const rules = parseRules("1:10:60");

    expect(rules).toEqual([{ max: 1, windowMs: 10_000 }]);
  });

  it("returns no rules when the header is missing or empty", () => {
    expect(parseRules(null)).toEqual([]);
    expect(parseRules("")).toEqual([]);
  });

  it("drops a malformed tier and keeps the well-formed ones", () => {
    const rules = parseRules("5:10:60,15:60,nonsense,30:300:1800");

    expect(rules).toEqual([
      { max: 4, windowMs: 10_000 },
      { max: 29, windowMs: 300_000 },
    ]);
  });
});

describe("parseState", () => {
  it("reads the server's request count and window for each tier", () => {
    const state = parseState("3:10:0,7:60:0");

    expect(state).toEqual([
      { hits: 3, windowSeconds: 10, restrictedSeconds: 0 },
      { hits: 7, windowSeconds: 60, restrictedSeconds: 0 },
    ]);
  });

  it("reports how many seconds a tier is currently restricted for", () => {
    const state = parseState("5:10:47");

    expect(state).toEqual([
      { hits: 5, windowSeconds: 10, restrictedSeconds: 47 },
    ]);
  });

  it("returns nothing when the header is missing or empty", () => {
    expect(parseState(null)).toEqual([]);
    expect(parseState("")).toEqual([]);
  });

  it("drops a malformed entry and keeps the rest", () => {
    const state = parseState("3:10:0,7:60,9:300:12");

    expect(state).toEqual([
      { hits: 3, windowSeconds: 10, restrictedSeconds: 0 },
      { hits: 9, windowSeconds: 300, restrictedSeconds: 12 },
    ]);
  });
});
