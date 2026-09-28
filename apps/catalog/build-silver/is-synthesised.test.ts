import { describe, expect, it } from "@jest/globals";
import { isSynthesised } from "./is-synthesised.ts";

const iconWith = (options: string): string =>
  `https://web.poecdn.com/gen/image/${Buffer.from(options).toString("base64url")}/abc/Ring.png`;

describe("isSynthesised", () => {
  it("reads an icon whose render options say synthesised is true as synthesised", () => {
    const icon = iconWith("[25,14,{\"f\":\"x\",\"synthesised\":true}]");

    expect(isSynthesised(icon)).toBe(true);
  }); // the flag hides inside base64url JSON in the path

  it("reads an icon whose render options say synthesised is false as not synthesised", () => {
    const icon = iconWith("[25,14,{\"synthesised\":false}]");

    expect(isSynthesised(icon)).toBe(false);
  }); // the key alone is not enough

  it("reads an icon URL with no image segment as not synthesised", () => {
    expect(isSynthesised("https://example.com/Ring.png")).toBe(false);
  }); // no "/image/" means nothing to decode

  it("reads an empty icon as not synthesised", () => {
    expect(isSynthesised("")).toBe(false);
  }); // degenerate input

  it("misses the flag when the options put a space after the colon", () => {
    const icon = iconWith("{\"synthesised\": true}");

    expect(isSynthesised(icon)).toBe(false);
  }); // exact substring match, not a JSON parse
});
