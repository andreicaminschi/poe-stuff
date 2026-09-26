import { describe, it, expect } from "@jest/globals";
import { GggHttpError } from "./errors.ts";

describe("GggHttpError", () => {
  it("names the url and status in its message", () => {
    const error = new GggHttpError("https://a.test/x", 503, true);

    expect(error.message).toBe("https://a.test/x failed: 503");
    expect(error.name).toBe("GggHttpError");
    expect(error).toBeInstanceOf(Error);
  });
});
