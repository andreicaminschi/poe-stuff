import { describe, it, expect } from "@jest/globals";
import { trimUrl } from "./config.ts";

describe("trimUrl", () => {
  it("removes the one trailing slash off a base", () => {
    const url = trimUrl("https://a.test/x/");

    expect(url).toBe("https://a.test/x");
  }); // so joins never double a slash

  it("removes two trailing slashes, not just the last one", () => {
    const url = trimUrl("https://a.test/x//");

    expect(url).toBe("https://a.test/x");
  }); // one-or-more

  it("leaves a URL without a trailing slash exactly as it was", () => {
    const url = trimUrl("https://a.test/x");

    expect(url).toBe("https://a.test/x");
  }); // inner slashes untouched
});
