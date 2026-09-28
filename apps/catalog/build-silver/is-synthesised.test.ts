import { describe, expect, it } from "@jest/globals";
import { isSynthesised } from "./is-synthesised.ts";

const iconWith = (options: string): string =>
  `https://web.poecdn.com/gen/image/${Buffer.from(options).toString("base64url")}/abc/Ring.png`;

describe("isSynthesised", () => {
  it("reads a synthesised icon as synthesised", () => {
    expect(isSynthesised(iconWith("[25,14,{\"f\":\"x\",\"synthesised\":true}]"))).toBe(true);
  });

  it("reads an icon whose options say false as not synthesised", () => {
    expect(isSynthesised(iconWith("[25,14,{\"synthesised\":false}]"))).toBe(false);
  });

  it("reads an icon with no image segment as not synthesised", () => {
    expect(isSynthesised("https://example.com/Ring.png")).toBe(false);
  });

  it("reads an empty icon as not synthesised", () => {
    expect(isSynthesised("")).toBe(false);
  });

  it("reads the flag with a space after the colon as not synthesised", () => {
    expect(isSynthesised(iconWith("{\"synthesised\": true}"))).toBe(false); // exact substring match
  });
});
