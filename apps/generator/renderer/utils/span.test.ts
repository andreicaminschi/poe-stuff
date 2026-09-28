import { describe, it, expect } from "@jest/globals";
import { span } from "./span.ts";

describe("span", () => {
  it("reads a bucket from 150c with no ceiling as 150c and up", () => {
    const text = span({ name: "T0", floor: 150 }, "c");

    expect(text).toBe("150c and up");
  }); // no ceiling means open-ended

  it("reads a bucket from zero to 1c as under 1c", () => {
    const text = span({ name: "T5", floor: 0, ceiling: 1 }, "c");

    expect(text).toBe("under 1c");
  }); // a zero floor drops the lower bound

  it("reads a bucket from 30c to 50c as a range with the unit once", () => {
    const text = span({ name: "T2", floor: 30, ceiling: 50 }, "c");

    expect(text).toBe("30-50c");
  }); // unit only after the ceiling

  it("reads a bucket from zero with no ceiling as zero and up, not as under anything", () => {
    const text = span({ name: "T5", floor: 0 }, "");

    expect(text).toBe("0 and up");
  }); // the open-ended case is checked before the zero-floor case
});
