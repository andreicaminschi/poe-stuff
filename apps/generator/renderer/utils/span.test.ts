import { describe, it, expect } from "@jest/globals";
import { span } from "./span.ts";

describe("span", () => {
  it("reads an open-ended bucket as its floor and up", () => {
    expect(span({ name: "T0", floor: 150 }, "c")).toBe("150c and up");
  });

  it("reads a bucket starting at zero as under its ceiling", () => {
    expect(span({ name: "T5", floor: 0, ceiling: 1 }, "c")).toBe("under 1c");
  });

  it("reads a closed bucket as a range", () => {
    expect(span({ name: "T2", floor: 30, ceiling: 50 }, "c")).toBe("30-50c");
  });

  it("reads an open-ended bucket at zero as zero and up, not under anything", () => {
    expect(span({ name: "T5", floor: 0 }, "")).toBe("0 and up");
  });
});
