import { describe, expect, it } from "@jest/globals";
import { RepoeHttpError } from "./errors.ts";

describe("RepoeHttpError", () => {
  it("reads as the status and the URL that answered with it", () => {
    const error = new RepoeHttpError("https://a.test/x.json", 503);

    expect(error.message).toBe("repoe 503 for https://a.test/x.json");
    expect(error.name).toBe("RepoeHttpError");
    expect(error).toBeInstanceOf(Error);
  });
});
