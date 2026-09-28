import { describe, expect, it } from "@jest/globals";
import { trimUrl } from "./config.ts";

describe("trimUrl", () => {
  it("drops the one trailing slash off a base", () => {
    const url = trimUrl("https://a.b/");

    expect(url).toBe("https://a.b");
  }); // so joins never double a slash

  it("leaves a URL without a trailing slash exactly as it was", () => {
    const url = trimUrl("https://a.b/api");

    expect(url).toBe("https://a.b/api");
  }); // inner slashes untouched

  it("drops two trailing slashes, not just the last one", () => {
    const url = trimUrl("https://a.b//");

    expect(url).toBe("https://a.b");
  }); // one-or-more

  it("turns a lone slash into an empty string", () => {
    const url = trimUrl("/");

    expect(url).toBe("");
  }); // degenerate base, joins become root-relative
});
