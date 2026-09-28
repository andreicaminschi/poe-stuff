import { describe, expect, it } from "@jest/globals";
import { PoeWatchHttpError } from "./errors.ts";

describe("PoeWatchHttpError", () => {
  it("reads as the 429 status and the URL that answered with it", () => {
    const error = new PoeWatchHttpError("https://pw.test/x", 429);

    expect(error.message).toBe("poewatch 429 for https://pw.test/x");
    expect(error.name).toBe("PoeWatchHttpError");
  }); // name survives where instanceof does not
});
