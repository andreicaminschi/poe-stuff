import { describe, expect, it } from "@jest/globals";
import { trimUrl } from "./config.ts";

describe("trimUrl", () => {
  it("strips the one trailing slash off a base", () => {
    const url = trimUrl("https://a.test/");

    expect(url).toBe("https://a.test");
  }); // so joins never produce a double slash

  it("leaves a URL with no trailing slash exactly as it was", () => {
    const url = trimUrl("https://a.test/x");

    expect(url).toBe("https://a.test/x");
  }); // inner slashes are untouched

  it("strips two trailing slashes, not just the last one", () => {
    const url = trimUrl("https://a.test//");

    expect(url).toBe("https://a.test");
  }); // the pattern is one-or-more
});
