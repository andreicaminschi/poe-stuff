import { describe, it, expect } from "@jest/globals";
import { GggHttpError } from "./errors.ts";

describe("GggHttpError", () => {
  it("reads as the URL that failed and the 503 it failed with", () => {
    const error = new GggHttpError("https://a.test/x", 503, true);

    expect(error.message).toBe("https://a.test/x failed: 503");
    expect(error.name).toBe("GggHttpError");
  }); // name survives where instanceof does not
});
