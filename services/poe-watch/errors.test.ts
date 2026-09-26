import { describe, expect, it } from "@jest/globals";
import { PoeWatchHttpError } from "./errors.ts";

describe("PoeWatchHttpError", () => {
  it("names the status and URL in its message and name", () => {
    const error = new PoeWatchHttpError("https://pw.test/x", 429);

    expect(error.message).toBe("poewatch 429 for https://pw.test/x");
    expect(error.name).toBe("PoeWatchHttpError");
    expect(error).toBeInstanceOf(Error);
  });
});
