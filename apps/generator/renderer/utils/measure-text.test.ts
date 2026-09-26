import { describe, it, expect, afterAll } from "@jest/globals";
import { measureText } from "./measure-text.ts";

const scope = globalThis as { document?: unknown };

afterAll(() => {
  delete scope.document;
});

describe("measureText", () => {
  it("estimates the width from the character count when the canvas has no 2D context", () => {
    scope.document = { createElement: () => ({ getContext: () => null }) };

    expect(measureText("Mirror", 10)).toBeCloseTo(6 * 10 * 0.62);
  });
});
