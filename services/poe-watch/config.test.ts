import { describe, expect, it } from "@jest/globals";
import { trimUrl } from "./config.ts";

describe("trimUrl", () => {
  it("drops one trailing slash", () => {
    expect(trimUrl("https://a.b/")).toBe("https://a.b");
  });

  it("leaves a URL without a trailing slash alone", () => {
    expect(trimUrl("https://a.b/api")).toBe("https://a.b/api");
  });

  it("drops every trailing slash", () => {
    expect(trimUrl("https://a.b//")).toBe("https://a.b");
  });

  it("turns a lone slash into an empty string", () => {
    expect(trimUrl("/")).toBe("");
  });
});
