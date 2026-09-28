import { describe, expect, it } from "@jest/globals";
import { dateFromHour, hourFromDate, parseHour, previousHour, runId } from "./run-id.ts";

describe("runId", () => {
  it("joins the league's slug and the hour with an underscore", () => {
    expect(runId("Settlers of Kalguur", 1788292800)).toBe("settlers-of-kalguur_1788292800");
  });
});

describe("previousHour", () => {
  it("answers the hour before the one now running", () => {
    expect(previousHour(Date.UTC(2025, 0, 1, 10, 30))).toBe(Date.UTC(2025, 0, 1, 9) / 1000);
  });

  it("answers the hour before even at the exact top of an hour", () => {
    expect(previousHour(Date.UTC(2025, 0, 1, 10))).toBe(Date.UTC(2025, 0, 1, 9) / 1000);
  });

  it("answers the hour before the last millisecond of an hour", () => {
    expect(previousHour(Date.UTC(2025, 0, 1, 11) - 1)).toBe(Date.UTC(2025, 0, 1, 9) / 1000);
  });
});

describe("hourFromDate", () => {
  it("reads the date as UTC", () => {
    expect(hourFromDate("2025-12-12-01")).toBe(Date.UTC(2025, 11, 12, 1) / 1000);
  });

  it("refuses a date without the hour", () => {
    expect(() => hourFromDate("2025-12-12")).toThrow("YYYY-MM-DD-HH");
  });

  it("refuses a date with single-digit fields", () => {
    expect(() => hourFromDate("2025-1-2-3")).toThrow("YYYY-MM-DD-HH");
  });

  it("refuses an impossible month and hour", () => {
    expect(() => hourFromDate("2025-13-01-25")).toThrow("is not a real date");
  });

  it("round-trips through the readable form", () => {
    expect(dateFromHour(hourFromDate("2024-02-29-23"))).toBe("2024-02-29-23");
  });
});

describe("dateFromHour", () => {
  it("drops the minutes of an hour id that does not sit on the hour", () => {
    expect(dateFromHour(Date.UTC(2025, 0, 1, 5, 59) / 1000)).toBe("2025-01-01-05");
  });
});

describe("parseHour", () => {
  it("accepts an id on the hour", () => {
    expect(parseHour("3600")).toBe(3600);
  });

  it("refuses zero", () => {
    expect(() => parseHour("0")).toThrow("unix seconds");
  });

  it("refuses a negative hour", () => {
    expect(() => parseHour("-3600")).toThrow("unix seconds");
  });

  it("refuses a fraction", () => {
    expect(() => parseHour("3600.5")).toThrow("unix seconds");
  });

  it("refuses text", () => {
    expect(() => parseHour("abc")).toThrow("unix seconds");
  });

  it("refuses an id one second past the hour", () => {
    expect(() => parseHour("3601")).toThrow("does not sit on the hour");
  });

  it("refuses the hour written in hex or with padding", () => {
    expect(() => parseHour("0xE10")).toThrow("Expected an hour id");
    expect(() => parseHour(" 3600 ")).toThrow("Expected an hour id");
  });
});
