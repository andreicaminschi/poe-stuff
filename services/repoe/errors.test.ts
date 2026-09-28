import { describe, expect, it } from "@jest/globals";
import { RepoeHttpError, RepoeParseError } from "./errors.ts";

describe("RepoeHttpError", () => {
  it("reads as the 503 status and the URL that answered with it", () => {
    const error = new RepoeHttpError("https://a.test/x.json", 503);

    expect(error.message).toBe("repoe 503 for https://a.test/x.json");
    expect(error.name).toBe("RepoeHttpError");
  }); // name survives serialisation where instanceof does not
});

describe("RepoeParseError", () => {
  it("names the URL and keeps the JSON failure it was caused by", () => {
    const cause = new SyntaxError("Unexpected end of JSON input");

    const error = new RepoeParseError("https://a.test/x.json", cause);

    expect(error.message).toBe("repoe returned invalid JSON for https://a.test/x.json");
    expect(error.name).toBe("RepoeParseError");
    expect(error.cause).toBe(cause);
  }); // cause is passed through to Error
});
