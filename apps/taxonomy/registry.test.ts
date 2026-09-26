import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import {
  assertParentPublished,
  assertPublishable,
  entryOf,
  gameVersion,
  highestDraft,
  newestVersion,
  nextVersion,
  readRegistry,
  versionNumber,
  writeRegistry,
} from "./registry.ts";
import type { Registry } from "./types.ts";

const registryOf = (versions: Registry["versions"], next = 10): Registry => ({ next, versions });
const at = "2026-01-01T00:00:00.000Z";

describe("versionNumber", () => {
  it("reads the last part of a version as its number", () => {
    expect(versionNumber("3.29.12")).toBe(12);
  });

  it("refuses a version with only two parts", () => {
    expect(() => versionNumber("3.29")).toThrow('"3.29" is not a version');
  });

  it("refuses a version with four parts", () => {
    expect(() => versionNumber("3.29.1.2")).toThrow("is not a version");
  });
});

describe("gameVersion", () => {
  it("reads the first two parts as the game version", () => {
    expect(gameVersion("3.29.12")).toBe("3.29");
  });

  it("refuses text that is not a version", () => {
    expect(() => gameVersion("latest")).toThrow('"latest" is not a version');
  });
});

describe("reading and writing the registry", () => {
  let root: string;
  let lake: Lake;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-registry-"));
    lake = createLakeService({ root });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("starts an empty registry at version one when no file exists", async () => {
    expect(await readRegistry(lake)).toEqual({ next: 1, versions: {} });
  });

  it("reads back the registry it wrote", async () => {
    const registry = registryOf({ "3.29.1": { state: "draft", createdAt: at } }, 2);

    await writeRegistry(lake, registry);

    expect(await readRegistry(lake)).toEqual(registry);
  });
});

describe("entryOf", () => {
  it("throws when the version is not in the registry", () => {
    expect(() => entryOf(registryOf({}), "3.29.1")).toThrow("3.29.1 does not exist.");
  });
});

describe("newestVersion", () => {
  it("compares version numbers as numbers, so 10 beats 9", () => {
    const registry = registryOf({
      "3.29.9": { state: "published", createdAt: at },
      "3.29.10": { state: "published", createdAt: at },
    });

    expect(newestVersion(registry)).toBe("3.29.10");
  });

  it("ignores the game part and ranks only by the last number", () => {
    const registry = registryOf({
      "3.30.1": { state: "published", createdAt: at },
      "3.29.2": { state: "published", createdAt: at },
    });

    expect(newestVersion(registry)).toBe("3.29.2");
  });

  it("has no newest version in an empty registry", () => {
    expect(newestVersion(registryOf({}))).toBeUndefined();
  });
});

describe("highestDraft", () => {
  it("is the newest version when that version is a draft", () => {
    const registry = registryOf({
      "3.29.1": { state: "published", createdAt: at },
      "3.29.2": { state: "draft", createdAt: at },
    });

    expect(highestDraft(registry)).toBe("3.29.2");
  });

  it("is nothing when an older draft sits under a newer published version", () => {
    const registry = registryOf({
      "3.29.1": { state: "draft", createdAt: at },
      "3.29.2": { state: "published", createdAt: at },
    });

    expect(highestDraft(registry)).toBeUndefined();
  });
});

describe("assertParentPublished", () => {
  it("refuses to start from a draft", () => {
    const registry = registryOf({ "3.29.1": { state: "draft", createdAt: at } });

    expect(() => assertParentPublished(registry, "3.29.1")).toThrow("3.29.1 is a draft");
  });

  it("accepts a published parent", () => {
    const registry = registryOf({ "3.29.1": { state: "published", createdAt: at } });

    expect(() => assertParentPublished(registry, "3.29.1")).not.toThrow();
  });
});

describe("assertPublishable", () => {
  it("refuses a version that is already published", () => {
    const registry = registryOf({ "3.29.1": { state: "published", createdAt: at } });

    expect(() => assertPublishable(registry, "3.29.1")).toThrow("already published");
  });

  it("refuses a draft that a newer draft has overtaken", () => {
    const registry = registryOf({
      "3.29.1": { state: "draft", createdAt: at },
      "3.29.2": { state: "draft", createdAt: at },
    });

    expect(() => assertPublishable(registry, "3.29.1")).toThrow("overtaken by 3.29.2");
  });

  it("accepts the newest draft", () => {
    const registry = registryOf({ "3.29.2": { state: "draft", createdAt: at } });

    expect(() => assertPublishable(registry, "3.29.2")).not.toThrow();
  });
});

describe("nextVersion", () => {
  it("numbers the new version off the registry counter, not off the parent", () => {
    expect(nextVersion(registryOf({}, 7), "3.29.2")).toBe("3.29.7");
  });
});
