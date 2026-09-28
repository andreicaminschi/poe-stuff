import { describe, expect, it } from "@jest/globals";
import { dateFromHour, hourFromDate, parseHour, previousHour, runId } from "./run-id.ts";

describe("runId", () => {
  it("joins the league's slug and the hour with an underscore", () => {
    expect(runId("Settlers of Kalguur", 1788292800)).toBe("settlers-of-kalguur_1788292800");
  }); // the hour stays a raw id, never a date
});

describe("previousHour", () => {
  it("answers 09:00 when the clock reads 10:30", () => {
    const hour = previousHour(Date.UTC(2025, 0, 1, 10, 30));

    expect(hour).toBe(Date.UTC(2025, 0, 1, 9) / 1000);
  }); // the running hour is not published yet

  it("answers 09:00 at exactly 10:00", () => {
    const hour = previousHour(Date.UTC(2025, 0, 1, 10));

    expect(hour).toBe(Date.UTC(2025, 0, 1, 9) / 1000);
  }); // the top of the hour already belongs to the new hour

  it("answers 09:00 one millisecond before 11:00", () => {
    const hour = previousHour(Date.UTC(2025, 0, 1, 11) - 1);

    expect(hour).toBe(Date.UTC(2025, 0, 1, 9) / 1000);
  }); // floor, not round
});

describe("hourFromDate", () => {
  it("reads 2025-12-12-01 as 01:00 UTC", () => {
    expect(hourFromDate("2025-12-12-01")).toBe(Date.UTC(2025, 11, 12, 1) / 1000);
  }); // never local time

  it("refuses a date with no hour", () => {
    expect(() => hourFromDate("2025-12-12")).toThrow("YYYY-MM-DD-HH");
  }); // pattern needs four fields

  it("refuses a date with single-digit fields", () => {
    expect(() => hourFromDate("2025-1-2-3")).toThrow("YYYY-MM-DD-HH");
  }); // zero padding is required

  it("refuses month 13 and hour 25", () => {
    expect(() => hourFromDate("2025-13-01-25")).toThrow("is not a real date");
  }); // Date.UTC rolls over, the round trip catches it

  it("accepts 23:00 on the leap day of 2024 and reads it back unchanged", () => {
    const date = dateFromHour(hourFromDate("2024-02-29-23"));

    expect(date).toBe("2024-02-29-23");
  }); // a real leap day must survive the round-trip check
});

describe("dateFromHour", () => {
  it("drops the minutes of an id at 05:59", () => {
    expect(dateFromHour(Date.UTC(2025, 0, 1, 5, 59) / 1000)).toBe("2025-01-01-05");
  }); // truncates the ISO string, never rounds
});

describe("parseHour", () => {
  it("accepts 3600, one hour past the epoch", () => {
    expect(parseHour("3600")).toBe(3600);
  }); // smallest valid id

  it("refuses zero", () => {
    expect(() => parseHour("0")).toThrow("unix seconds");
  }); // on the hour, but not a real collection

  it("refuses a negative hour", () => {
    expect(() => parseHour("-3600")).toThrow("unix seconds");
  }); // the minus fails the digits-only check

  it("refuses a fraction", () => {
    expect(() => parseHour("3600.5")).toThrow("unix seconds");
  }); // Number would accept it

  it("refuses text", () => {
    expect(() => parseHour("abc")).toThrow("unix seconds");
  }); // NaN never reaches the modulo

  it("refuses 3601, one second past the hour", () => {
    expect(() => parseHour("3601")).toThrow("does not sit on the hour");
  }); // the CDN has no file between hours

  it("refuses the hour written in hex", () => {
    expect(() => parseHour("0xE10")).toThrow("Expected an hour id");
  }); // Number("0xE10") is 3600

  it("refuses the hour padded with spaces", () => {
    expect(() => parseHour(" 3600 ")).toThrow("Expected an hour id");
  }); // Number trims, the regex does not
});
