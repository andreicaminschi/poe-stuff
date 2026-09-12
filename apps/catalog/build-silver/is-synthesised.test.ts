import { describe, it, expect } from "@jest/globals";
import { isSynthesised } from "./is-synthesised.ts";

const SYNTH =
  "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvSmV3ZWxzL0doYXN0bHlFeWUiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MSwic3ludGhlc2lzZWQiOnRydWV9XQ/6d68c7b124/GhastlyEye.png";
const PLAIN =
  "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvSmV3ZWxzL0doYXN0bHlFeWUiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MX1d/ed72511412/GhastlyEye.png";

describe("isSynthesised", () => {
  it("reads synthesis out of the icon's options", () => {
    expect(isSynthesised(SYNTH)).toBe(true);
  });

  it("is false for a plain icon", () => {
    expect(isSynthesised(PLAIN)).toBe(false);
  });

  it("is false for a URL with no image segment", () => {
    expect(isSynthesised("https://example.com/icon.png")).toBe(false);
  });
});
