import { describe, it, expect } from "@jest/globals";
import {
  assertParentPublished,
  assertPublishable,
  gameVersion,
  highestDraft,
  nextVersion,
  versionNumber,
} from "./registry.ts";
import type { Registry, VersionState } from "./types.ts";

const registry = (versions: Record<string, VersionState>, next = 99): Registry => ({
  next,
  versions: Object.fromEntries(
    Object.entries(versions).map(([id, state]) => [id, { state, createdAt: "2026-01-01" }]),
  ),
});

describe("version strings", () => {
  it("orders by the count, not by the patch", () => {
    expect(versionNumber("3.29.12")).toBeGreaterThan(versionNumber("3.29.9"));
    expect(versionNumber("3.30.4")).toBeLessThan(versionNumber("3.29.12"));
  });

  it("reads the patch off a version", () => {
    expect(gameVersion("3.29.12")).toBe("3.29");
  });

  it("refuses a string that is not a version", () => {
    expect(() => versionNumber("3.29")).toThrow("is not a version");
  });

  it("gives a new version the parent's patch and the registry's next number", () => {
    expect(nextVersion(registry({}, 14), "3.29.12")).toBe("3.29.14");
  });
});

describe("highestDraft", () => {
  it("is the newest version while it is a draft", () => {
    expect(highestDraft(registry({ "3.29.1": "published", "3.29.2": "draft", "3.29.3": "draft" }))).toBe(
      "3.29.3",
    );
  });

  it("is nothing once a newer version is published over an older draft", () => {
    expect(highestDraft(registry({ "3.29.2": "draft", "3.29.3": "published" }))).toBeUndefined();
  });

  it("compares numerically, so 10 is newer than 9", () => {
    expect(highestDraft(registry({ "3.29.9": "draft", "3.29.10": "draft" }))).toBe("3.29.10");
  });
});

describe("assertPublishable", () => {
  it("accepts the newest draft", () => {
    expect(() => assertPublishable(registry({ "3.29.1": "published", "3.29.2": "draft" }), "3.29.2")).not.toThrow();
  });

  it("refuses a draft overtaken by a newer draft, naming it", () => {
    expect(() => assertPublishable(registry({ "3.29.2": "draft", "3.29.3": "draft" }), "3.29.2")).toThrow(
      "overtaken by 3.29.3",
    );
  });

  it("refuses a draft overtaken by a newer published version", () => {
    expect(() => assertPublishable(registry({ "3.29.2": "draft", "3.29.3": "published" }), "3.29.2")).toThrow(
      "overtaken by 3.29.3",
    );
  });

  it("refuses a version that is already published", () => {
    expect(() => assertPublishable(registry({ "3.29.1": "published" }), "3.29.1")).toThrow("already published");
  });

  it("refuses a version that does not exist", () => {
    expect(() => assertPublishable(registry({}), "3.29.1")).toThrow("does not exist");
  });
});

describe("assertParentPublished", () => {
  it("refuses a draft as a parent", () => {
    expect(() => assertParentPublished(registry({ "3.29.2": "draft" }), "3.29.2")).toThrow("is a draft");
  });
});
