import { describe, it, expect } from "@jest/globals";
import { trimUrl } from "./config.ts";

describe("trimUrl", () => {
  it("removes one trailing slash", () => {
    expect(trimUrl("https://a.test/x/")).toBe("https://a.test/x");
  });

  it("removes every trailing slash", () => {
    expect(trimUrl("https://a.test/x//")).toBe("https://a.test/x");
  });

  it("leaves a url without a trailing slash alone", () => {
    expect(trimUrl("https://a.test/x")).toBe("https://a.test/x");
  });
});
