import { describe, expect, it } from "@jest/globals";
import { trimUrl } from "./config.ts";

describe("trimUrl", () => {
  it("strips one trailing slash", () => {
    expect(trimUrl("https://a.test/")).toBe("https://a.test");
  });

  it("leaves a URL with no trailing slash alone", () => {
    expect(trimUrl("https://a.test/x")).toBe("https://a.test/x");
  });

  it("strips every trailing slash", () => {
    expect(trimUrl("https://a.test//")).toBe("https://a.test");
  });
});
