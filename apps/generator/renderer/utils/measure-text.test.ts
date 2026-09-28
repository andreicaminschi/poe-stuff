import { describe, it, expect, afterAll } from "@jest/globals";
import { measureText } from "./measure-text.ts";

const scope = globalThis as { document?: unknown };

afterAll(() => {
  delete scope.document;
});

describe("measureText", () => {
  it("estimates a six-letter name at 10px as 6 × 10 × 0.62 wide when the browser gives no canvas context", () => {
    scope.document = { createElement: () => ({ getContext: () => null }) };

    const width = measureText("Mirror", 10);

    expect(width).toBeCloseTo(6 * 10 * 0.62);
  }); // the ruler is cached per module, so only one path is testable per load
});
