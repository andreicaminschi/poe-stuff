import { describe, expect, it } from "@jest/globals";
import { PoeNinjaHttpError } from "./errors.ts";

describe("PoeNinjaHttpError", () => {
  it("names the status and URL and says nothing of attempts after one try", () => {
    const error = new PoeNinjaHttpError("https://x/p", 404, 1);

    expect(error.message).toBe("poe-ninja 404 for https://x/p");
    expect(error.name).toBe("PoeNinjaHttpError");
  }); // one attempt is the unremarkable case

  it("says it made two attempts once it asked twice", () => {
    const error = new PoeNinjaHttpError("https://x/p", 503, 2);

    expect(error.message).toBe("poe-ninja 503 for https://x/p (2 attempts)");
  }); // suffix only above one
});
